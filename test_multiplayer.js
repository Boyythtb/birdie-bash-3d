import puppeteer from 'puppeteer';

async function run() {
  console.log('🚀 Starting multiplayer test...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  try {
    const pageHost = await browser.newPage();
    const pageGuest = await browser.newPage();

    pageHost.on('console', msg => {
      const text = msg.text();
      if (!text.includes('[vite]') && !text.includes('THREE.')) {
        console.log('[HOST CONSOLE]', text);
      }
    });
    pageGuest.on('console', msg => {
      const text = msg.text();
      if (!text.includes('[vite]') && !text.includes('THREE.')) {
        console.log('[GUEST CONSOLE]', text);
      }
    });

    pageHost.on('pageerror', err => console.error('[HOST ERROR]', err.message));
    pageGuest.on('pageerror', err => console.error('[GUEST ERROR]', err.message));

    console.log('Navigating Host and Guest to http://localhost:5173/ ...');
    await Promise.all([
      pageHost.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' }),
      pageGuest.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
    ]);

    // Wait 2.5s for loading screen to complete and main-menu to show
    console.log('Waiting for main menu...');
    await new Promise(r => setTimeout(r, 2500));

    // 1. Host opens Online Modal and creates room
    console.log('Host opening Online modal and creating room...');
    await pageHost.evaluate(() => {
      document.getElementById('btn-menu-online').click();
    });
    await new Promise(r => setTimeout(r, 600));

    await pageHost.evaluate(() => {
      document.getElementById('card-create-room').click();
    });

    // Wait for room creation in Firebase
    let roomCode = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 800));
      roomCode = await pageHost.evaluate(() => {
        const el = document.getElementById('display-room-code');
        return el ? el.innerText.trim() : null;
      });
      if (roomCode && roomCode !== '----' && roomCode !== 'TẠO MÃ...' && roomCode.length >= 3) {
        break;
      }
    }
    console.log('🎉 Room created by Host with code:', roomCode);

    if (!roomCode || roomCode === '----' || roomCode.length < 3) {
      throw new Error('Host failed to get room code!');
    }

    // 2. Guest opens Online Modal and joins room
    console.log('Guest joining room:', roomCode);
    await pageGuest.evaluate((code) => {
      document.getElementById('btn-menu-online').click();
      document.getElementById('room-code-input').value = code;
      document.getElementById('btn-join-room').click();
    }, roomCode);

    // Wait for Guest to connect and players to appear in room
    await new Promise(r => setTimeout(r, 2000));

    // 3. Guest clicks Sẵn Sàng
    console.log('Guest clicking Sẵn Sàng...');
    await pageGuest.evaluate(() => {
      document.getElementById('btn-room-ready').click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // 4. Host clicks Bắt Đầu
    console.log('Host clicking Bắt Đầu...');
    await pageHost.evaluate(() => {
      const btn = document.getElementById('btn-host-start');
      if (btn) btn.click();
    });

    // Wait for match transition to SERVE
    await new Promise(r => setTimeout(r, 3000));

    // 5. Inspect match state on both Host and Guest
    const hostInfo = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      const serveBar = document.getElementById('serve-indicator-bar');
      const btnHit = document.getElementById('btn-hit');
      const hudP1 = document.getElementById('hud-player-name');
      const hudP2 = document.getElementById('hud-bot-name');
      return {
        state: g.state,
        multiplayerSlot: g.multiplayerSlot,
        serverSlot: g.serverSlot,
        canServe: typeof g.canPlayerServe === 'function' ? g.canPlayerServe() : null,
        serveBarText: serveBar ? serveBar.innerText.trim() : null,
        serveBarClasses: serveBar ? serveBar.className : null,
        btnHitText: btnHit ? btnHit.innerText.trim().replace(/\s+/g, ' ') : null,
        hudP1: hudP1 ? hudP1.innerText.trim() : null,
        hudP2: hudP2 ? hudP2.innerText.trim() : null,
        shuttlePos: g.shuttlecock ? { ...g.shuttlecock.position } : null,
        shuttleAirborne: g.shuttlecock ? g.shuttlecock.isAirborne : null
      };
    });

    const guestInfo = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      const serveBar = document.getElementById('serve-indicator-bar');
      const btnHit = document.getElementById('btn-hit');
      const hudP1 = document.getElementById('hud-player-name');
      const hudP2 = document.getElementById('hud-bot-name');
      return {
        state: g.state,
        multiplayerSlot: g.multiplayerSlot,
        serverSlot: g.serverSlot,
        canServe: typeof g.canPlayerServe === 'function' ? g.canPlayerServe() : null,
        serveBarText: serveBar ? serveBar.innerText.trim() : null,
        serveBarClasses: serveBar ? serveBar.className : null,
        btnHitText: btnHit ? btnHit.innerText.trim().replace(/\s+/g, ' ') : null,
        hudP1: hudP1 ? hudP1.innerText.trim() : null,
        hudP2: hudP2 ? hudP2.innerText.trim() : null,
        shuttlePos: g.shuttlecock ? { ...g.shuttlecock.position } : null,
        shuttleAirborne: g.shuttlecock ? g.shuttlecock.isAirborne : null
      };
    });

    console.log('\n========================================');
    console.log('HOST STATUS BEFORE SERVE:');
    console.log(JSON.stringify(hostInfo, null, 2));
    console.log('----------------------------------------');
    console.log('GUEST STATUS BEFORE SERVE:');
    console.log(JSON.stringify(guestInfo, null, 2));
    console.log('========================================\n');

    // VERIFY PRE-SERVE CHECKS:
    // Host must be slot 0, Guest must be slot 1
    // ServerSlot must be 0
    // Host canServe must be true, Guest canServe must be false
    // Host serveBarText must contain "LƯỢT BẠN PHÁT CẦU"
    // Guest serveBarText must contain "ĐỐI THỦ ĐANG PHÁT CẦU"
    const checks = [
      { name: 'Host is slot 0', pass: hostInfo.multiplayerSlot === 0 },
      { name: 'Guest is slot 1', pass: guestInfo.multiplayerSlot === 1 },
      { name: 'Host canServe is true', pass: hostInfo.canServe === true },
      { name: 'Guest canServe is false', pass: guestInfo.canServe === false },
      { name: 'Host see LƯỢT BẠN PHÁT CẦU', pass: hostInfo.serveBarText && hostInfo.serveBarText.includes('LƯỢT BẠN PHÁT CẦU') },
      { name: 'Guest see ĐANG PHÁT CẦU', pass: guestInfo.serveBarText && guestInfo.serveBarText.includes('ĐANG PHÁT CẦU') }
    ];

    console.log('--- PRE-SERVE VERIFICATION ---');
    checks.forEach(c => {
      console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
    });

    // 6. Test: Guest attempts to serve while not their turn (should be blocked)
    console.log('\nGuest attempting illegal serve (should be blocked)...');
    await pageGuest.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 500));

    const guestIllegalCheck = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      return {
        shuttleAirborne: g.shuttlecock ? g.shuttlecock.isAirborne : null,
        state: g.state
      };
    });
    console.log('Guest illegal serve blocked? AirBorne:', guestIllegalCheck.shuttleAirborne, '(should be false)');

    // 7. Host serves with Space
    console.log('\nHost pressing Space to serve legally...');
    await pageHost.keyboard.press('Space');

    // Wait 1.2s for serve physics and Firebase sync
    await new Promise(r => setTimeout(r, 1200));

    const hostAfterServe = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        shuttlePos: g.shuttlecock ? { ...g.shuttlecock.position } : null,
        shuttleVel: g.shuttlecock ? { ...g.shuttlecock.velocity } : null,
        shuttleAirborne: g.shuttlecock ? g.shuttlecock.isAirborne : null
      };
    });

    const guestAfterServe = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        shuttlePos: g.shuttlecock ? { ...g.shuttlecock.position } : null,
        shuttleVel: g.shuttlecock ? { ...g.shuttlecock.velocity } : null,
        shuttleAirborne: g.shuttlecock ? g.shuttlecock.isAirborne : null
      };
    });

    console.log('\n========================================');
    console.log('HOST STATUS AFTER SERVE:');
    console.log(JSON.stringify(hostAfterServe, null, 2));
    console.log('----------------------------------------');
    console.log('GUEST STATUS AFTER SERVE:');
    console.log(JSON.stringify(guestAfterServe, null, 2));
    console.log('========================================\n');

    const serveChecks = [
      { name: 'Host game transitioned to RALLY', pass: hostAfterServe.state === 'RALLY' },
      { name: 'Guest game transitioned to RALLY', pass: guestAfterServe.state === 'RALLY' },
      { name: 'Host shuttle is airborne', pass: hostAfterServe.shuttleAirborne === true },
      { name: 'Guest shuttle is airborne', pass: guestAfterServe.shuttleAirborne === true },
      { name: 'Host shuttle flying towards opponent (vel.z < 0)', pass: hostAfterServe.shuttleVel && hostAfterServe.shuttleVel.z < 0 },
      { name: 'Guest shuttle flying towards player side (vel.z > 0)', pass: guestAfterServe.shuttleVel && guestAfterServe.shuttleVel.z > 0 }
    ];

    console.log('--- AFTER-SERVE VERIFICATION ---');
    serveChecks.forEach(c => {
      console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
    });

    // 8. Wait for point to conclude and next serve cycle to begin
    console.log('\nWaiting for shuttlecock to land and point to conclude...');
    await new Promise(r => setTimeout(r, 4000));

    const hostPoint = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      const serveBar = document.getElementById('serve-indicator-bar');
      return {
        state: g.state,
        score: `${g.playerScore} - ${g.botScore}`,
        serverSlot: g.serverSlot,
        canServe: typeof g.canPlayerServe === 'function' ? g.canPlayerServe() : null,
        serveBarText: serveBar ? serveBar.innerText.trim() : null
      };
    });

    const guestPoint = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      const serveBar = document.getElementById('serve-indicator-bar');
      return {
        state: g.state,
        score: `${g.playerScore} - ${g.botScore}`,
        serverSlot: g.serverSlot,
        canServe: typeof g.canPlayerServe === 'function' ? g.canPlayerServe() : null,
        serveBarText: serveBar ? serveBar.innerText.trim() : null
      };
    });

    console.log('\n========================================');
    console.log('HOST AFTER POINT:\n', JSON.stringify(hostPoint, null, 2));
    console.log('----------------------------------------');
    console.log('GUEST AFTER POINT:\n', JSON.stringify(guestPoint, null, 2));
    console.log('========================================\n');

    const pointChecks = [
      { name: 'Host transitioned to SERVE for next rally', pass: hostPoint.state === 'SERVE' },
      { name: 'Guest transitioned to SERVE for next rally', pass: guestPoint.state === 'SERVE' },
      { name: 'Scores synchronized (Host P1 = Guest P2)', pass: hostPoint.score.split(' - ')[0] === guestPoint.score.split(' - ')[1] && hostPoint.score.split(' - ')[1] === guestPoint.score.split(' - ')[0] },
      { name: 'Server role matches on both (canServe exclusive)', pass: (hostPoint.canServe && !guestPoint.canServe) || (!hostPoint.canServe && guestPoint.canServe) }
    ];

    console.log('--- NEXT POINT & SERVE CYCLE VERIFICATION ---');
    pointChecks.forEach(c => {
      console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
    });

    const allPassed = checks.every(c => c.pass) && serveChecks.every(c => c.pass) && pointChecks.every(c => c.pass);
    if (allPassed) {
      console.log('\n🎉🎉🎉 ALL MULTIPLAYER SERVE TESTS PASSED PERFECTLY! 🎉🎉🎉');
    } else {
      console.log('\n⚠️ Some multiplayer checks failed!');
    }

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await browser.close();
    console.log('Test session ended.');
  }
}

run();
