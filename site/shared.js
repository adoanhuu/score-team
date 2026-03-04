// Gestion du menu responsive
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

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
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});
