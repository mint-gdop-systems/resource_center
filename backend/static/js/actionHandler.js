// Load SweetAlert2 if not already loaded
if (typeof Swal === "undefined") {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
  script.defer = true;
  document.head.appendChild(script);
}

export async function performAction({
  url,
  method = "POST",
  data = {},
  successMessage = "Action completed successfully!",
  errorMessage = "Something went wrong.",
  csrf = true,
}) {
  // Show loading spinner
  Swal.fire({
    title: "Processing...",
    text: "Please wait...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (csrf) {
      headers["X-CSRFToken"] = getCookie("csrftoken");
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("Failed");

    const result = await response.json();

    Swal.fire({
      icon: "success",
      title: "Success",
      text: successMessage,
      timer: 3000,
      showConfirmButton: false,
    });

    return result;
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: errorMessage,
    });
    throw err;
  }
}

// Get CSRF for Django
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
