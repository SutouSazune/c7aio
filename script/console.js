// Virtual Console Logic

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

window.addEventListener('load', () => {
  injectConsoleUI();
  initCustomConsole();
});

function injectConsoleUI() {
  // 1. Inject Modal HTML
  if (!document.getElementById('consoleModal')) {
    const modalHTML = `
      <div id="consoleModal" class="modal console-modal">
        <div class="modal-content console-content">
          <div class="modal-header console-header">
            <h2>💻 System Logs</h2>
            <div class="console-actions">
              <button class="console-action-btn clear" onclick="clearCustomConsole()">🚫 Clear</button>
              <button class="console-close" onclick="toggleConsole()">✕</button>
            </div>
          </div>
          <div class="modal-body console-body" id="consoleOutput"></div>
          <div class="console-footer">
            <span class="console-prompt">&gt;</span>
            <input type="text" id="consoleInput" class="console-input" placeholder="Nhập lệnh JS..." autocomplete="off">
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // 2. Inject Toggle Button
  if (!document.getElementById('consoleToggle')) {
    const headerRight = document.querySelector('.header-right');
    const headerContent = document.querySelector('.header-content');
    
    // Nút bấm
    const btn = document.createElement('button');
    btn.id = 'consoleToggle';
    btn.className = 'console-toggle';
    btn.onclick = toggleConsole;
    btn.style.display = 'none'; // Mặc định ẩn
    btn.title = 'Mở Console Log';
    btn.textContent = '💻';

    if (headerRight) {
      // Trang chủ (index.html)
      headerRight.insertBefore(btn, headerRight.firstChild);
    } else if (headerContent) {
      // Các trang con (lich, nv, tb...) - Dùng absolute positioning
      btn.classList.add('console-absolute');
      headerContent.appendChild(btn);
    }
  }

  // 3. Check Admin để hiện nút
  if (typeof isAdmin === 'function' && isAdmin()) {
    const btn = document.getElementById('consoleToggle');
    if (btn) btn.style.display = 'inline-block';
  }
}

function initCustomConsole() {
  // Override console methods
  console.log = function(...args) {
    originalConsole.log.apply(console, args);
    appendLogToUI('info', args);
  };

  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
    appendLogToUI('warn', args);
  };

  console.error = function(...args) {
    originalConsole.error.apply(console, args);
    appendLogToUI('error', args);
  };

  // Setup Drag & Drop
  const consoleContent = document.querySelector('.console-content');
  if (consoleContent) makeDraggable(consoleContent);

  // Setup Input Execution
  const input = document.getElementById('consoleInput');
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const cmd = this.value;
        if (!cmd) return;
        this.value = '';
        console.log('> ' + cmd);
        try {
          const result = window.eval(cmd);
          if (result !== undefined) console.log(result);
        } catch (err) {
          console.error(err);
        }
      }
    });
  }
}

function appendLogToUI(type, args) {
  const consoleBody = document.getElementById('consoleOutput');
  if (!consoleBody) return;

  const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg, null, 2); } catch (e) { return '[Object]'; }
    }
    return String(arg);
  }).join(' ');

  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.innerHTML = `<span class="log-time">[${time}]</span> ${message.replace(/\n/g, '<br>')}`;
  
  consoleBody.appendChild(logEntry);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function toggleConsole() {
  const modal = document.getElementById('consoleModal');
  modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function clearCustomConsole() {
  const consoleBody = document.getElementById('consoleOutput');
  if (consoleBody) consoleBody.innerHTML = '';
}

function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('.console-header');
  if (header) header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX; pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event; e.preventDefault();
    pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px"; element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
}