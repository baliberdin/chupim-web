$(document).ready(function () {
  
    const showNavbar = (toggleId, navId) => {
      const toggle = document.getElementById(toggleId),
        nav = document.getElementById(navId);
  
      // Validate that all variables exist
      if (toggle && nav) {
        toggle.addEventListener("click", () => {
          // show navbar
          nav.classList.toggle("sidebar_show");
          // change icon
          toggle.classList.toggle("bx-x");
        });
      }
    };
  
    showNavbar("header-toggle", "nav-bar");
  
    /*===== LINK ACTIVE =====*/
    const linkColor = document.querySelectorAll(".nav_link");
  
    function colorLink() {
      if (linkColor) {
        linkColor.forEach( l => l.classList.remove("sidebar_active"));
        this.classList.add("sidebar_active");
      }
    }
    linkColor.forEach((l) => l.addEventListener("click", colorLink));
  
});