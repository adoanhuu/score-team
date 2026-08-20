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
  const normalizePage = (page) => (page || 'index.html').replace(/\.html$/i, '') || 'index';
  const currentPage = normalizePage(window.location.pathname.split('/').pop());
  const currentHash = window.location.hash;
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const url = new URL(href, window.location.href);
    const linkPage = normalizePage(url.pathname.split('/').pop());
    const linkHash = url.hash;
    const isSamePage = linkPage === currentPage;
    const isHashMatch = linkHash ? linkHash === currentHash : !currentHash;
    if (isSamePage && isHashMatch) {
      link.classList.add('active');
    }
  });
});
