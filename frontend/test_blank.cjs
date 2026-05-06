const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:5173/registro');
  await page.fill('input[placeholder="Documento de Identidad (CC)"]', '123123123');
  await page.fill('input[placeholder="Código de Estudiante"]', '123');
  await page.fill('input[placeholder="Nombre Completo"]', 'Test Name');
  await page.fill('input[placeholder="Correo Institucional"]', 'test@test.com');
  await page.click('button:has-text("Siguiente")');
  
  // Step 2
  await page.waitForTimeout(500);
  await page.click('button:has-text("Capturar Foto")');
  await page.click('button:has-text("Siguiente")');

  // Step 3
  await page.waitForTimeout(500);
  await page.click('button:has-text("Capturar Foto")');
  await page.click('button:has-text("Siguiente")');

  // Step 4
  await page.waitForTimeout(500);
  await page.click('button:has-text("Capturar Foto")');
  await page.click('button:has-text("Siguiente")');

  // Step 5
  await page.waitForTimeout(500);
  await page.click('button:has-text("Confirmar y Registrar")');

  await page.waitForTimeout(2000);

  await browser.close();
})();
