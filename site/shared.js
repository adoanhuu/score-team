// Gestion du menu responsive
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const versionBadges = document.querySelectorAll('.site-version');

  versionBadges.forEach(badge => {
    badge.textContent = window.APP_VERSION;
  });

  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }

  // Fermer le menu quand on clique sur un lien
  const navLinks = document.querySelectorAll('.site-nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      nav.classList.remove('active');
    });
  });

  // Fermer le menu quand on clique ailleurs
  document.addEventListener('click', function(event) {
    const isClickInsideNav = nav && nav.contains(event.target);
    const isClickOnToggle = menuToggle && menuToggle.contains(event.target);

    if (!isClickInsideNav && !isClickOnToggle && nav) {
      nav.classList.remove('active');
    }
  });

  // Marquer le lien actuel
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const currentHash = window.location.hash;
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const url = new URL(href, window.location.href);
    const linkPage = url.pathname.split('/').pop() || 'index.html';
    const linkHash = url.hash;
    const isSamePage = linkPage === currentPage || (currentPage === '' && linkPage === 'index.html');
    const isHashMatch = linkHash ? linkHash === currentHash : !currentHash;
    if (isSamePage && isHashMatch) {
      link.classList.add('active');
    }
  });
});
