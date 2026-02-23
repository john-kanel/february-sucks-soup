import './style.css';

const form = document.getElementById('soup-form');
const statusEl = document.querySelector('.form-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = {
    name: data.get('name')?.toString().trim(),
    guests: Number(data.get('guests'))
  };

  if (!payload.name || !payload.guests) {
    showStatus('Please fill out every field.', 'error');
    return;
  }

  showStatus('Sending your RSVP…', 'info');

  try {
    const response = await fetch('/api/rsvps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    form.reset();
    showStatus('Looking forward to seeing you there!', 'success');
  } catch (error) {
    console.error(error);
    showStatus('Could not submit right now. Please try again.', 'error');
  }
});

function showStatus(message, tone) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

