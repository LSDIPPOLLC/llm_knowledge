document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const sections = document.querySelectorAll('.content-section');

  function showSection(id) {
    const targetSection = document.getElementById(id);
    if (!targetSection) return;

    sections.forEach(section => {
      section.classList.remove('active');
    });

    targetSection.classList.add('active');

    let parentToExpand = null;

    navItems.forEach(item => {
      const itemSection = item.getAttribute('data-section');
      const isActive = itemSection === id;
      item.classList.toggle('active', isActive);

      if (item.classList.contains('has-sub')) {
        const subItems = item.nextElementSibling;
        if (subItems && subItems.classList.contains('nav-sub-items')) {
          const isChildActive = Array.from(subItems.children).some(
            child => child.getAttribute('data-section') === id
          );
          if (isChildActive) {
            parentToExpand = item;
          }
        }
        if (isActive) {
          item.classList.add('expanded');
          if (subItems) subItems.style.display = 'block';
        }
      }
    });

    if (parentToExpand) {
      parentToExpand.classList.add('expanded');
      const subItems = parentToExpand.nextElementSibling;
      if (subItems) {
        subItems.style.display = 'block';
      }
    }

    history.pushState(null, '', `#${id}`);
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const id = item.getAttribute('data-section');
      showSection(id);
    });
  });

  document.querySelectorAll('.nav-item.has-sub').forEach(parent => {
    parent.addEventListener('click', (e) => {
      if (e.target !== parent) return;
      e.preventDefault();
      parent.classList.toggle('expanded');
      const subItems = parent.nextElementSibling;
      if (subItems) {
        subItems.style.display = parent.classList.contains('expanded') ? 'block' : 'none';
      }
    });
  });

  if (location.hash) {
    const id = location.hash.substring(1);
    const section = document.getElementById(id);
    if (section) {
      setTimeout(() => showSection(id), 100);
    }
  }

  window.addEventListener('hashchange', () => {
    const id = location.hash.substring(1);
    const section = document.getElementById(id);
    if (section) {
      showSection(id);
    }
  });

  const firstSection = document.querySelector('.content-section');
  if (firstSection && !location.hash) {
    firstSection.classList.add('active');
  }
});