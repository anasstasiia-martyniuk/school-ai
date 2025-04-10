document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');
    const input = document.getElementById('user-input');
  
    sendBtn.addEventListener('click', sendText);
  
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
              selectedCriteria: criteria
            })
          });
  
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Serverfout ${response.status}: ${text}`);
          }
  
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
  