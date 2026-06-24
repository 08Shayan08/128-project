document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const dataPath = "../data/data.json";

  function getInitials(title) {
    return title
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function renderServices(services) {
    const servicesList = document.querySelector("#servicesList");
    const homeServices = document.querySelector("#homeServices");

    if (servicesList) {
      servicesList.innerHTML = services
        .map((service) => `
          <article class="service-card">
            <span class="card-icon">${getInitials(service.title)}</span>
            <h2>${service.title}</h2>
            <p>${service.desc}</p>
          </article>
        `)
        .join("");
    }

    if (homeServices) {
      homeServices.innerHTML = services
        .slice(0, 3)
        .map((service, index) => `
          <article class="feature-card">
            <span class="card-icon">${String(index + 1).padStart(2, "0")}</span>
            <h3>${service.title}</h3>
            <p>${service.desc}</p>
          </article>
        `)
        .join("");
    }
  }

  function renderTeam(team) {
    const teamList = document.querySelector("#teamList");
    const images = [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=700&q=80"
    ];

    if (!teamList) {
      return;
    }

    teamList.innerHTML = team
      .map((member, index) => `
        <article class="team-card">
          <img src="${images[index % images.length]}" alt="${member.name}">
          <div>
            <h2>${member.name}</h2>
            <p>${member.role}</p>
          </div>
        </article>
      `)
      .join("");
  }

  function renderTestimonials(testimonials) {
    const testimonialsList = document.querySelector("#testimonialsList");

    if (!testimonialsList) {
      return;
    }

    testimonialsList.innerHTML = testimonials
      .slice(0, 2)
      .map((testimonial) => `
        <article class="testimonial-card">
          <p>"${testimonial.text}"</p>
          <span>${testimonial.name}</span>
        </article>
      `)
      .join("");
  }

  function showDataError() {
    ["#servicesList", "#homeServices", "#teamList", "#testimonialsList"].forEach((selector) => {
      const container = document.querySelector(selector);

      if (container) {
        container.innerHTML = '<p class="loading-message">Content could not be loaded.</p>';
      }
    });
  }

  async function loadPageData() {
    const needsData = document.querySelector("#servicesList, #homeServices, #teamList, #testimonialsList");

    if (!needsData) {
      return;
    }

    try {
      const response = await fetch(dataPath, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Data request failed");
      }

      const data = await response.json();
      renderServices(data.services || []);
      renderTeam(data.team || []);
      renderTestimonials(data.testimonials || []);
    } catch (error) {
      showDataError();
    }
  }

  loadPageData();

  const contactForm = document.querySelector("#contactForm");

  if (!contactForm) {
    return;
  }

  const fields = {
    name: document.querySelector("#name"),
    email: document.querySelector("#email"),
    message: document.querySelector("#message")
  };

  const errors = {
    name: document.querySelector("#nameError"),
    email: document.querySelector("#emailError"),
    message: document.querySelector("#messageError")
  };

  const formStatus = document.querySelector("#formStatus");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(field, message) {
    errors[field].textContent = message;
  }

  function clearErrors() {
    Object.keys(errors).forEach((field) => setError(field, ""));
    formStatus.textContent = "";
  }

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();

    let isValid = true;
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const message = fields.message.value.trim();

    if (name.length < 2) {
      setError("name", "Please enter your name.");
      isValid = false;
    }

    if (!emailPattern.test(email)) {
      setError("email", "Please enter a valid email address.");
      isValid = false;
    }

    if (message.length < 10) {
      setError("message", "Please enter a message of at least 10 characters.");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    formStatus.textContent = "Thanks. Your message is ready to send once backend support is connected.";
    contactForm.reset();
  });
});
