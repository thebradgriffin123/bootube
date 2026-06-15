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

  // Load existing words and toggle state
  const { blocklist = DEFAULT_BLOCKLIST, hideCC = true, enableBlur = true, extensionEnabled = true } = await chrome.storage.local.get(['blocklist', 'hideCC', 'enableBlur', 'extensionEnabled']);
  
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

  function renderList() {
    wordListEl.innerHTML = '';
    blocklist.forEach((word, index) => {
      const li = document.createElement('li');
      
      const textSpan = document.createElement('span');
      textSpan.textContent = obfuscate(word);
      textSpan.className = 'word-text';
      
      const btnGroup = document.createElement('div');
      btnGroup.className = 'btn-group';
      
      const revealBtn = document.createElement('button');
      revealBtn.className = 'reveal-btn';
      revealBtn.innerHTML = '👁️';
      let isRevealed = false;
      revealBtn.onclick = () => {
        isRevealed = !isRevealed;
        textSpan.textContent = isRevealed ? word : obfuscate(word);
        revealBtn.innerHTML = isRevealed ? '🙈' : '👁️';
      };
      
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.onclick = async () => {
        blocklist.splice(index, 1);
        await chrome.storage.local.set({ blocklist });
        renderList();
      };
      
      btnGroup.appendChild(revealBtn);
      btnGroup.appendChild(delBtn);
      
      li.appendChild(textSpan);
      li.appendChild(btnGroup);
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
