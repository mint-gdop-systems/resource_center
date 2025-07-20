// Home Page Specific JavaScript

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    initHomePage();
  });
  
  // Home Page Specific Functionality
  function initHomePage() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href");
        const targetSection = document.querySelector(targetId);
  
        if (targetSection) {
          const headerOffset = 80;
          const elementPosition = targetSection.offsetTop;
          const offsetPosition = elementPosition - headerOffset;
  
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      });
    });
  
    // Navbar scroll effect
    const navbar = document.querySelector(".navbar");
    if (navbar) {
      window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
      });
    }
  
    // Update last updated time in footer
    const lastUpdatedElement = document.getElementById("last-updated");
    if (lastUpdatedElement) {
      const now = new Date();
      lastUpdatedElement.textContent = now.toLocaleString();
    }
  
    // Add scroll animations for feature cards
    const observeElements = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.style.opacity = "1";
              entry.target.style.transform = "translateY(0)";
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px -50px 0px",
        },
      );
  
      // Observe feature cards, process steps, and support cards
      const animatedElements = document.querySelectorAll(
        ".feature-card, .process-step, .support-card, .about-card",
      );
      animatedElements.forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.observe(el);
      });
    };
  
    // Initialize scroll animations
    observeElements();
  
    // Add hover effects to dashboard mockup
    const mockup = document.querySelector(".dashboard-mockup");
    if (mockup) {
      mockup.addEventListener("mouseenter", () => {
        mockup.style.transform =
          "perspective(1000px) rotateY(-2deg) rotateX(2deg) scale(1.02)";
      });
  
      mockup.addEventListener("mouseleave", () => {
        mockup.style.transform =
          "perspective(1000px) rotateY(-5deg) rotateX(5deg) scale(1)";
      });
    }
  
    // Add click tracking for CTA buttons (for analytics)
    const ctaButtons = document.querySelectorAll(
      ".hero-actions .btn, .cta-actions .btn",
    );
    ctaButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        // Track button clicks (implement your analytics here)
        console.log("CTA Button clicked:", button.textContent.trim());
      });
    });
  
    // Add typing effect to hero title (optional enhancement)
    const heroTitle = document.querySelector(".hero-title");
    if (heroTitle && heroTitle.textContent.includes("Welcome to the")) {
      const fullText = heroTitle.innerHTML;
      heroTitle.innerHTML =
        'Welcome to the <span class="text-primary">Resource Center</span>';
  
      // Add a subtle pulse to the Resource Center text
      const resourceCenterText = heroTitle.querySelector(".text-primary");
      if (resourceCenterText) {
        setInterval(() => {
          resourceCenterText.style.transform = "scale(1.05)";
          setTimeout(() => {
            resourceCenterText.style.transform = "scale(1)";
          }, 150);
        }, 3000);
      }
    }
  
    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== "undefined") {
      const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]'),
      );
      tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }
  }