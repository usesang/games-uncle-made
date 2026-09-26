(() => {
  const triggers = [...document.querySelectorAll('[data-install-trigger]')];
  if (!triggers.length) return;

  const installed = () =>
    window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;
  if (installed() || !window.matchMedia('(pointer: coarse), (max-width: 760px)').matches) return;

  let installPrompt = null;
  triggers.forEach(trigger => { trigger.hidden = false; });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener('appinstalled', () => { triggers.forEach(trigger => { trigger.hidden = true; }); });

  const dialog = document.createElement('dialog');
  dialog.className = 'install-dialog';
  dialog.setAttribute('aria-label', '홈 화면에 추가하는 방법');
  dialog.innerHTML = `
    <h2>홈 화면에 추가하기</h2>
    <p>앱은 기기에서 직접 설치를 승인해야 해요. 설치 후 홈 화면 아이콘으로 열면 브라우저 메뉴 없이 즐길 수 있어요.</p>
    <ol>
      <li><strong>iPhone·iPad:</strong> Safari의 공유 버튼을 누르고 <strong>홈 화면에 추가</strong>를 선택하세요.</li>
      <li><strong>Android:</strong> Chrome 메뉴에서 <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택하세요.</li>
    </ol>
    <button type="button" data-install-close>닫기</button>`;
  document.body.append(dialog);
  dialog.querySelector('[data-install-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  async function openInstall() {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === 'accepted') triggers.forEach(trigger => { trigger.hidden = true; });
      } catch { dialog.showModal(); }
      return;
    }
    dialog.showModal();
  }
  triggers.forEach(trigger => trigger.addEventListener('click', openInstall));
})();
