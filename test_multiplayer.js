import puppeteer from 'puppeteer';

async function run() {
  console.log('🚀 Starting 4-turn continuous multiplayer rally test...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-size=1280,800'
    ]
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

    // ==========================================
    // TURN 1: HOST SERVES
    // ==========================================
    console.log('\n--- TURN 1: HOST SERVES ---');
    await pageHost.bringToFront();
    await pageHost.keyboard.press('Space');

    // Bring Guest to front so Guest simulates ball arrival
    await pageGuest.bringToFront();
    // Wait until shuttle reaches Guest's court
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 50));
      const reached = await pageGuest.evaluate(() => {
        const g = window.gameManager || {};
        const s = g.shuttlecock;
        return s && s.isAirborne && s.position.z > 2.0;
      });
      if (reached) break;
    }

    // ==========================================
    // TURN 2: GUEST RETURNS
    // ==========================================
    console.log('\n--- TURN 2: GUEST RETURNS ---');
    await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      // Move guest to intercept ball
      if (g.shuttlecock) {
        g.player.group.position.x = g.shuttlecock.position.x;
        g.player.group.position.z = Math.min(5.0, g.shuttlecock.position.z + 0.3);
      }
      g.attemptSmartHit();
    });
    await new Promise(r => setTimeout(r, 100));

    const guestTurn2 = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        lastHitter: g.shuttlecock ? g.shuttlecock.lastHitter : null,
        rallyCount: g.rallyCount
      };
    });
    console.log('Guest Turn 2 hit:', guestTurn2);

    // Switch focus back to Host so requestAnimationFrame runs on Host!
    await pageHost.bringToFront();

    // Wait until ball reaches Host's court
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 50));
      const status = await pageHost.evaluate(() => {
        const g = window.gameManager || {};
        const s = g.shuttlecock;
        return {
          airborne: s ? s.isAirborne : false,
          z: s ? s.position.z : null,
          vz: s ? s.velocity.z : null,
          lastHitter: s ? s.lastHitter : null
        };
      });
      if (i % 5 === 0 || (status.z && status.z > 0.8)) {
        console.log(`[Host wait i=${i}] z=${status.z?.toFixed(2)}, vz=${status.vz?.toFixed(2)}, airborne=${status.airborne}, hitter=${status.lastHitter}`);
      }
      if (status.airborne && status.lastHitter === 'bot' && status.z > 0.8) break;
    }

    // ==========================================
    // TURN 3: HOST RETURNS (Fixes previous turn-3 drop)
    // ==========================================
    console.log('\n--- TURN 3: HOST RETURNS ---');
    const hostDiagBefore = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      const s = g.shuttlecock;
      const p = g.player.group.position;
      return {
        shuttlePos: s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null,
        playerPos: { x: p.x, y: p.y, z: p.z },
        distXZ: s ? Math.hypot(p.x - s.position.x, p.z - s.position.z) : null,
        height: s ? s.position.y : null,
        canHitClear: typeof g.canHitShuttle === 'function' ? g.canHitShuttle('clear') : null,
        canHitSmash: typeof g.canHitShuttle === 'function' ? g.canHitShuttle('smash') : null,
        canHitHit: typeof g.canHitShuttle === 'function' ? g.canHitShuttle('hit') : null,
        resolvedType: typeof g.resolveContextualShotType === 'function' ? g.resolveContextualShotType() : null,
        lastHitter: s ? s.lastHitter : null
      };
    });
    console.log('Host diagnostic BEFORE Turn 3 hit:\n', JSON.stringify(hostDiagBefore, null, 2));

    await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      // Move host to intercept ball
      if (g.shuttlecock) {
        g.player.group.position.x = g.shuttlecock.position.x;
        g.player.group.position.z = Math.min(5.0, g.shuttlecock.position.z + 0.3);
      }
      g.attemptSmartHit();
    });
    await new Promise(r => setTimeout(r, 100));

    const hostTurn3 = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        lastHitter: g.shuttlecock ? g.shuttlecock.lastHitter : null,
        rallyCount: g.rallyCount
      };
    });
    console.log('Host Turn 3 hit:', hostTurn3);

    // Switch focus back to Guest so requestAnimationFrame runs on Guest!
    await pageGuest.bringToFront();

    // Wait until ball reaches Guest's court
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 50));
      const status = await pageGuest.evaluate(() => {
        const g = window.gameManager || {};
        const s = g.shuttlecock;
        return {
          airborne: s ? s.isAirborne : false,
          z: s ? s.position.z : null,
          vz: s ? s.velocity.z : null,
          lastHitter: s ? s.lastHitter : null
        };
      });
      if (i % 5 === 0 || (status.z && status.z > 0.8)) {
        console.log(`[Guest wait i=${i}] z=${status.z?.toFixed(2)}, vz=${status.vz?.toFixed(2)}, airborne=${status.airborne}, hitter=${status.lastHitter}`);
      }
      if (status.airborne && status.lastHitter === 'bot' && status.z > 0.8) break;
    }

    // ==========================================
    // TURN 4: GUEST RETURNS
    // ==========================================
    console.log('\n--- TURN 4: GUEST RETURNS ---');
    await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      // Move guest to intercept ball
      if (g.shuttlecock) {
        g.player.group.position.x = g.shuttlecock.position.x;
        g.player.group.position.z = Math.min(5.0, g.shuttlecock.position.z + 0.3);
      }
      g.attemptSmartHit();
    });
    await new Promise(r => setTimeout(r, 100));

    const guestTurn4 = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        lastHitter: g.shuttlecock ? g.shuttlecock.lastHitter : null,
        rallyCount: g.rallyCount
      };
    });
    console.log('Guest Turn 4 hit:', guestTurn4);

    // Switch focus back to Host so Host receives and renders Turn 4
    await pageHost.bringToFront();

    // Wait 400ms for Host to receive Turn 4
    await new Promise(r => setTimeout(r, 400));

    const hostStateFinal = await pageHost.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        lastHitter: g.shuttlecock ? g.shuttlecock.lastHitter : null,
        rallyCount: g.rallyCount
      };
    });

    const guestStateFinal = await pageGuest.evaluate(() => {
      const g = window.gameManager || {};
      return {
        state: g.state,
        lastHitter: g.shuttlecock ? g.shuttlecock.lastHitter : null,
        rallyCount: g.rallyCount
      };
    });

    console.log('\n=== FINAL RALLY STATUS ===');
    console.log('HOST FINAL:', hostStateFinal);
    console.log('GUEST FINAL:', guestStateFinal);

    const checks = [
      { name: 'Turn 2: Guest returned successfully', pass: guestTurn2.lastHitter === 'player' && guestTurn2.rallyCount >= 2 },
      { name: 'Turn 3: Host returned successfully', pass: hostTurn3.lastHitter === 'player' && hostTurn3.rallyCount >= 3 },
      { name: 'Turn 4: Guest returned successfully', pass: guestTurn4.lastHitter === 'player' && guestTurn4.rallyCount >= 4 },
      { name: 'Host received Turn 4 (lastHitter === "bot")', pass: hostStateFinal.lastHitter === 'bot' },
      { name: 'Both remain in active RALLY state', pass: hostStateFinal.state === 'RALLY' && guestStateFinal.state === 'RALLY' },
      { name: 'Rally count reached 4+ on both machines', pass: hostStateFinal.rallyCount >= 4 && guestStateFinal.rallyCount >= 4 }
    ];

    console.log('\n--- 4-TURN RALLY VERIFICATION ---');
    checks.forEach(c => {
      console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    if (allPassed) {
      console.log('\n🎉🎉🎉 4-TURN CONTINUOUS MULTIPLAYER RALLY PASSED 100%! ZERO DROPPED HITS! 🎉🎉🎉');
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
