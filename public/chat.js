document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-btn');
    const topicBtn = document.getElementById('generate-topic');
    const chatBox = document.getElementById('chat-box');
    const topicBox = document.getElementById('topic-box');
    const input = document.getElementById('user-input');
  
    let topicText = ''; // <== Додали глобальну змінну
  
    sendBtn.addEventListener('click', sendText);
    topicBtn.addEventListener('click', generateTopic);
  
    async function generateTopic() {
      const level = localStorage.getItem('level');
      const criteria = JSON.parse(localStorage.getItem('criteria') || '[]');
  
      topicBox.textContent = "Even wachten...";
  
      try {
        const response = await fetch('/topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level, selectedCriteria: criteria })
        });
  
        const result = await response.json();
        topicText = result.topic || ''; // <== Зберігаємо тему
        topicBox.textContent = topicText || 'Geen thema ontvangen.';
      } catch (err) {
        console.error("Fout bij het genereren van thema:", err);
        topicBox.textContent = 'Er is een fout opgetreden.';
      }
    }
  
    async function sendText() {
      const message = input.value.trim();
      if (!message) return;
  
      chatBox.innerHTML = `<p><em>Wachten op feedback...</em></p>`;
  
      const level = localStorage.getItem('level');
      const criteria = JSON.parse(localStorage.getItem('criteria') || '[]');
  
      try {
        const response = await fetch('/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: message,
            level: level,
            selectedCriteria: criteria,
            topic: topicText // <== Передаємо тему
          })
        });
  
        const result = await response.json();
        if (result.output) {
          chatBox.innerHTML = `<p>${result.output.replace(/\n/g, '<br>')}</p>`;
        } else {
          chatBox.innerHTML = `<p><strong>Er is iets misgegaan:</strong> ${result.error || 'Geen antwoord ontvangen.'}</p>`;
        }
      } catch (error) {
        chatBox.innerHTML = `<p><strong>Fout:</strong> ${error.message}</p>`;
      }
    }
  });
  