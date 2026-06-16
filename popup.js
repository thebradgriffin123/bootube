const DEFAULT_BLOCKLIST = [
  "goddamn", "god damn", "jesus christ", "jesus", "christ", 
  "damn", "hell", "fuck", "shit", "bitch", "asshole", 
  "motherfucker", "bastard"
];

document.addEventListener('DOMContentLoaded', async () => {
  const wordListEl = document.getElementById('wordList');
  const newWordInput = document.getElementById('newWord');
  const addBtn = document.getElementById('addBtn');
  const hideCcToggle = document.getElementById('hideCcToggle');
  const blurToggle = document.getElementById('blurToggle');
  const masterToggle = document.getElementById('masterToggle');
  
  const bulkRevealBtn = document.getElementById('bulkRevealBtn');
  const eyeIconOpen = document.getElementById('eyeIconOpen');
  const eyeIconClosed = document.getElementById('eyeIconClosed');
  
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const deleteCounter = document.getElementById('deleteCounter');
  
  let isRevealedMode = false;
  let isDeleteMode = false;
  let selectedForDeletion = new Set();

  // Load existing words and toggle state
  let { blocklist = DEFAULT_BLOCKLIST, disabledWords = [], hideCC = true, enableBlur = true, extensionEnabled = true } = await chrome.storage.local.get(['blocklist', 'disabledWords', 'hideCC', 'enableBlur', 'extensionEnabled']);
  
  masterToggle.checked = extensionEnabled;
  hideCcToggle.checked = hideCC;
  blurToggle.checked = enableBlur;
  
  masterToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ extensionEnabled: masterToggle.checked });
  });

  hideCcToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ hideCC: hideCcToggle.checked });
  });

  blurToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enableBlur: blurToggle.checked });
  });
  
  function obfuscate(phrase) {
    return phrase.split(' ').map(word => {
      if (word.length <= 2) return word;
      return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    }).join(' ');
  }

  bulkRevealBtn.addEventListener('click', () => {
    isRevealedMode = !isRevealedMode;
    eyeIconOpen.style.display = isRevealedMode ? 'none' : 'block';
    eyeIconClosed.style.display = isRevealedMode ? 'block' : 'none';
    renderList();
  });

  function exitDeleteMode() {
    isDeleteMode = false;
    selectedForDeletion.clear();
    deleteCounter.style.display = 'none';
    bulkDeleteBtn.style.display = 'block';
    bulkRevealBtn.style.display = 'block';
    confirmDeleteBtn.style.display = 'none';
    cancelDeleteBtn.style.display = 'none';
    renderList();
  }

  bulkDeleteBtn.addEventListener('click', async () => {
    if (!isDeleteMode) {
      isDeleteMode = true;
      selectedForDeletion.clear();
      deleteCounter.style.display = 'inline-block';
      deleteCounter.textContent = '0 selected';
      bulkDeleteBtn.style.display = 'none';
      bulkRevealBtn.style.display = 'none';
      confirmDeleteBtn.style.display = 'block';
      cancelDeleteBtn.style.display = 'block';
      renderList();
    }
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (selectedForDeletion.size > 0) {
      const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
      checkboxes.forEach(cb => {
        const li = cb.closest('li');
        li.style.opacity = '0';
        li.style.transform = 'translateY(-10px)';
      });
      setTimeout(async () => {
        blocklist = blocklist.filter(w => !selectedForDeletion.has(w));
        disabledWords = disabledWords.filter(w => !selectedForDeletion.has(w));
        await chrome.storage.local.set({ blocklist, disabledWords });
        exitDeleteMode();
      }, 250);
    } else {
      exitDeleteMode();
    }
  });

  cancelDeleteBtn.addEventListener('click', () => {
    exitDeleteMode();
  });

  function renderList() {
    wordListEl.innerHTML = '';
    const listActionsBar = document.querySelector('.list-actions-bar');
    
    if (blocklist.length === 0) {
      if (listActionsBar) listActionsBar.style.display = 'none';
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-state';
      emptyLi.innerHTML = '👻 Your blocklist is empty. Add a word above!';
      wordListEl.appendChild(emptyLi);
      return;
    } else {
      if (listActionsBar) listActionsBar.style.display = 'flex';
    }
    
    blocklist.forEach((word, index) => {
      const li = document.createElement('li');
      
      const textSpan = document.createElement('span');
      textSpan.textContent = isRevealedMode ? word : obfuscate(word);
      textSpan.className = 'word-text';
      
      const isDisabled = disabledWords.includes(word);
      if (isDisabled) {
        textSpan.style.textDecoration = 'line-through';
        textSpan.style.opacity = '0.5';
      }
      
      if (isDeleteMode) {
        const checkLabel = document.createElement('label');
        checkLabel.className = 'delete-check-label';
        const checkInput = document.createElement('input');
        checkInput.type = 'checkbox';
        checkInput.className = 'delete-checkbox';
        checkInput.checked = selectedForDeletion.has(word);
        checkInput.addEventListener('change', () => {
          if (checkInput.checked) {
            selectedForDeletion.add(word);
          } else {
            selectedForDeletion.delete(word);
          }
          deleteCounter.textContent = `${selectedForDeletion.size} selected`;
        });
        checkLabel.appendChild(checkInput);
        li.appendChild(checkLabel);
      }
      
      li.appendChild(textSpan);
      
      if (!isDeleteMode) {
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch small-switch';
        toggleLabel.title = !isDisabled ? "Disable filter for this word" : "Enable filter for this word";
        
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = !isDisabled;
        
        const toggleSlider = document.createElement('span');
        toggleSlider.className = 'slider';
        
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSlider);
        
        toggleInput.addEventListener('change', async () => {
          const wordIsNowDisabled = !toggleInput.checked;
          if (wordIsNowDisabled) {
            disabledWords.push(word);
          } else {
            disabledWords = disabledWords.filter(w => w !== word);
          }
          await chrome.storage.local.set({ disabledWords });
          renderList();
        });
        
        btnGroup.appendChild(toggleLabel);
        li.appendChild(btnGroup);
      }
      
      wordListEl.appendChild(li);
    });
  }
  
  renderList();

  // Add new word
  async function addWord() {
    const word = newWordInput.value.trim().toLowerCase();
    if (word && !blocklist.includes(word)) {
      blocklist.push(word);
      await chrome.storage.local.set({ blocklist });
      newWordInput.value = '';
      renderList();
    }
  }

  addBtn.addEventListener('click', addWord);
  newWordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addWord();
  });
});
