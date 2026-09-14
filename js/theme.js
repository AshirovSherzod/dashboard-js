try {
  const theme = localStorage.getItem('dashly.theme') || localStorage.getItem('theme');
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
} catch { document.documentElement.dataset.theme = 'light'; }
