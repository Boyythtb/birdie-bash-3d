import puppeteer from 'puppeteer';

async function run() {
  console.log('🚀 Starting multiplayer return-rally test...');
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

    console.log('Navigating Host and Guest to http://localhost:5173/ ...');
    await Promise.all([
      pageHost.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' }),
      pageGuest.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
    ]);

    await new Promise(r => setTimeout(r, 2500));

    // 1. Host creates room
    console.log('Host creating room...');
    await pageHost.evaluate(() => {
      document.getElementById('btn-menu-online').click();
    });
    await new Promise(r => setTimeout(r, 500));
    await pageHost.evaluate(() => {
      document.getElementById('card-create-room').click();
    });

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

    // 2. Guest joins room
    await pageGuest.evaluate((code) => {
      document.getElementById('btn-menu-online').click();
      document.getElementById('room-code-input').value = code;
      document.getElementById('btn-join-room').click();
    }, roomCode);

    await new Promise(r => setTimeout(r, 2000));

    // 3. Guest ready, Host start
    await pageGuest.evaluate(() => {
      document.getElementById('btn-room-ready').click();
    });
    await new Promise(r => setTimeout(r, 1200));

    await pageHost.evaluate(() => {
      const btn = document.getElementById('btn-host-start');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    // 4. Host serves
    console.log('Host serving...');
    await pageHost.keyboard.press('Space');

    // 5. Wait until shuttlecock is within hitting range on Guest's court
    let canHitNow = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 50));
      canHitNow = await pageGuest.evaluate(() => {
        const g = window.gameManager || {};
        const s = g.shuttlecock;
        if (!s || !s.isAirborne) return false;
        const p = g.player.group.position;
        const distXZ = Math.hypot(p.x - s.position.x, p.z - s.position.z);
        return distXZ <= 2.5 && s.position.y <= 2.8 && s.position.z > 1.0;
      });
      if (canHitNow) {
        console.log(`Shuttle arrived in Guest's hitting zone after ${(i + 1) * 50}ms!`);
        break;
      }
    }

    const guestShuttleBeforeHit = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      const s = g.shuttlecock;
      const p = g.player.group.position;
      return {
        shuttlePos: s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null,
        playerPos: { x: p.x, y: p.y, z: p.z },
        distXZ: s ? Math.hypot(p.x - s.position.x, p.z - s.position.z) : null,
        height: s ? s.position.y : null,
        canHit: typeof g.canHitShuttle === 'function' ? g.canHitShuttle('hit') : null,
        state: g.state
      };
    });
    console.log('\nGuest shuttle when ball arrives:', JSON.stringify(guestShuttleBeforeHit, null, 2));

    // 6. Guest returns the shuttlecock!
    console.log('\nGuest attempting to return shuttlecock (Smart Hit)...');
    await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      g.attemptSmartHit();
    });

    // Wait 120ms for any buffered action to execute in animation loop
    await new Promise(r => setTimeout(r, 120));

    const guestHitResult = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      const s = g.shuttlecock;
      return {
        state: g.state,
        lastHitter: s ? s.lastHitter : null,
        vel: s ? { x: s.velocity.x, y: s.velocity.y, z: s.velocity.z } : null,
        rallyCount: g.rallyCount
      };
    });
    console.log('Guest hit result:', JSON.stringify(guestHitResult, null, 2));

    // 7. Wait 500ms for Firebase to transmit hit to Host
    await new Promise(r => setTimeout(r, 600));

    const hostAfterGuestHit = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      const s = g.shuttlecock;
      return {
        state: g.state,
        score: `${g.playerScore} - ${g.botScore}`,
        lastHitter: s ? s.lastHitter : null,
        vel: s ? { x: s.velocity.x, y: s.velocity.y, z: s.velocity.z } : null,
        pos: s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null,
        rallyCount: g.rallyCount
      };
    });
    console.log('\nHost received return shot from Guest:\n', JSON.stringify(hostAfterGuestHit, null, 2));

    const checks = [
      { name: 'Guest hit succeeded (lastHitter === "player")', pass: guestHitResult.lastHitter === 'player' },
      { name: 'Guest shuttle flying back towards Host (vel.z < 0)', pass: guestHitResult.vel && guestHitResult.vel.z < 0 },
      { name: 'Host received return hit (lastHitter === "bot")', pass: hostAfterGuestHit.lastHitter === 'bot' },
      { name: 'Host shuttle flying towards Host (vel.z > 0)', pass: hostAfterGuestHit.vel && hostAfterGuestHit.vel.z > 0 },
      { name: 'Host game remains in RALLY (NO premature ACE!)', pass: hostAfterGuestHit.state === 'RALLY' },
      { name: 'Rally count incremented on both', pass: hostAfterGuestHit.rallyCount >= 2 }
    ];

    console.log('\n--- RALLY RETURN VERIFICATION ---');
    checks.forEach(c => {
      console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    if (allPassed) {
      console.log('\n🎉🎉🎉 RALLY RETURN TEST PASSED 100%! GUEST RETURNED SHOT AND RALLY CONTINUED! 🎉🎉🎉');
    } else {
      console.log('\n⚠️ Some checks failed!');
    }

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await browser.close();
    console.log('Test session ended.');
  }
}

run();
