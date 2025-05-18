import { performAction } from "./actionHandler.js";

let currentFolder = { id: null, name: "", parent: null };

let uploadedFile = null;
let dropzone = null; // Declare Dropzone globally
let categoryModalShown = false;

document.addEventListener("DOMContentLoaded", function () {
  // fetchFolders();
  fetchFilesAndFolders();
});

// Function to handle file upload with category selection
function uploadFileWithCategory() {
  // const uploadUrl = currentFolder.id ? `/file-upload/${currentFolder.id}/` : '/file-upload/';
  const uploadUrl = currentFolder.id
    ? `/file-upload/${currentFolder.id}/`
    : "/file-upload/";
  console.log(currentFolder);
  if (!uploadedFile) {
    // alert("No file selected!");
    return;
  }

  let selectedCategory = document.querySelector(
    'input[name="category_id"]:checked'
  );
  if (!selectedCategory) {
    // alert("Please select a category!");
    return;
  }

  let categoryId = selectedCategory.value;
  console.log(uploadedFile);
  // let fileName = uploadedFile.name;
  let fileNames = [];
  dropzone.files.forEach((file) => {
    fileNames.push(file.name);
  });
  let folderName = currentFolder.name;

  console.log("folderName:", folderName);
  // console.log("fileName:", fileName);

  function createFormData() {
    const formData = new FormData();
    // formData.append("file", uploadedFile);
    if (dropzone.files.length > 0) {
      dropzone.files.forEach((file) => {
        formData.append("files", file);
      });
    } else if (uploadedFile) {
      formData.append("files", uploadedFile);
    } else {
      return; // No file selected, exit function
    }
    // formData.append("files", uploadedFile);
    formData.append("category_id", categoryId);
    if (currentFolder.id !== null) {
      formData.append("folder_id", currentFolder.id);
    } else {
      formData.append("folder_id", ""); // Send empty string for root folder
    }

    return formData;
  }

  fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-CSRFToken": getCSRFToken(), // Add CSRF token
    },
    body: createFormData(),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        // showNotification([`Error: ${data.error}`]); // Pass as an array
        showErrorModal(
          "Duplicate File", // Title
          "A file with this name already exists in this folder.", // Message
          `<b>Filename: ${fileNames}<br><br>Folder: ${folderName}</b>` // Details with line break
        );
      } else {
        fetchFilesAndFolders(currentFolder.id);
        console.log("File uploaded successfully", data);
        console.log("currentFolder.id", currentFolder.id);
        // console.log(data.file.name);
        // currentFolder.name = data.folder_name;
        // alert("File uploaded successfully!");
        if (data.files) {
          showNotification(fileNames, "uploaded");
          // console.log(data.files);
        }
        // Remove file from Dropzone UI if Dropzone is initialized
        // Reset stored file
        showNotification(fileNames, "uploaded");
        // Close modal
      }
      fetchFilesAndFolders(currentFolder.id);
      // folderName = data.folder_name;
      // console.log("folderName: is good thing", folderName);
      if (dropzone) {
        // dropzone.removeFile(uploadedFile);
        dropzone.removeAllFiles();
      }
      uploadedFile = null;
      categoryModalShown = false;
      let modal = bootstrap.Modal.getInstance(
        document.getElementById("categoryModal")
      );
      modal.hide();
      checkIfFilesExist();
    })
    .catch((error) => {
      // Show error modal with file name and folder name
      showErrorModal(
        "Duplicate File", // Title
        "A file with this name already exists in this folder.", // Message
        `<b>Filename: ${fileNames}<br><br>Folder: ${folderName}</b>` // Details with line break
      );
    });
}

// Attach the upload function to the modal's button
document
  .getElementById("uploadButton")
  .addEventListener("click", uploadFileWithCategory);

// Function to fetch categories and show modal
function showCategoryModal() {
  fetch("/get-categories/")
    .then((response) => response.json())
    .then((data) => {
      if (data.categories && data.categories.length > 0) {
        const categoryCheckboxesContainer = document.getElementById(
          "category-checkboxes"
        );
        categoryCheckboxesContainer.innerHTML = ""; // Clear previous content

        // Loop through categories and create checkboxes
        data.categories.forEach((category) => {
          const checkboxDiv = document.createElement("div");
          checkboxDiv.classList.add("form-check");

          const checkboxInput = document.createElement("input");
          checkboxInput.classList.add("form-check-input");
          checkboxInput.type = "checkbox";
          checkboxInput.name = "category_id";
          checkboxInput.id = `category${category.id}`;
          checkboxInput.value = category.id;

          const label = document.createElement("label");
          label.classList.add("form-check-label");
          label.setAttribute("for", `category${category.id}`);
          label.textContent = category.name;

          checkboxDiv.appendChild(checkboxInput);
          checkboxDiv.appendChild(label);
          categoryCheckboxesContainer.appendChild(checkboxDiv);
        });

        // Show modal
        let modal = new bootstrap.Modal(
          document.getElementById("categoryModal")
        );
        modal.show();
      } else {
        // alert("No categories available.");
      }
    })
    .catch((error) => {
      console.error("Error fetching categories:", error);
      // alert("Failed to load categories.");
    });
}

// Initialize Dropzone when the page loads
document.addEventListener("DOMContentLoaded", function () {
  if (document.querySelector("#myDropzone")) {
    if (Dropzone.instances.length) {
      Dropzone.instances.forEach((dz) => dz.destroy());
    }
    Dropzone.autoDiscover = false;

    dropzone = new Dropzone("#myDropzone", {
      // Assign to global variable
      url: "/file-upload/",
      paramName: "files",
      maxFilesize: 100,
      maxFiles: 10,
      acceptedFiles:
        ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.csv,.json,.xml",
      clickable: [".upload-box", ".upload_card"],
      dictDefaultMessage: "",
      autoProcessQueue: false,
      headers: {
        "X-CSRFToken": getCSRFToken(), // Include CSRF token
      },

      init: function () {
        let dz = this;

        dz.on("addedfile", function (file) {
          uploadedFile = file; // Store file for later processing
          console.log("File added:", file.name);
          console.log("dz.files.length:", dz.files.length);

          // Show category selection modal
          // showCategoryModal();
          // if (dz.files.length === 1) {
          //   showCategoryModal();
          // }
          if (!categoryModalShown) {
            categoryModalShown = true; // Mark modal as shown
            showCategoryModal();
          }
        });

        dz.on("sending", function () {
          categoryModalShown = false;
        });

        dz.on("error", function (file, errorMessage) {
          console.error("Upload failed:", errorMessage);
          // alert("File upload failed!");
        });
      },
    });
  } else {
    console.error("#myDropzone element not found in the DOM.");
  }
});

function getCSRFToken() {
  let cookieValue = null;
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.startsWith("csrftoken=")) {
      cookieValue = cookie.substring("csrftoken=".length, cookie.length);
      break;
    }
  }
  return cookieValue;
}

document
  .getElementById("categoryModal")
  .addEventListener("hidden.bs.modal", function () {
    categoryModalShown = false;
  });

// Function to create a folder and update UI
function createFolder() {
  let folderName = document.getElementById("cf-folderName").value;
  let parentFolder = currentFolder.name ? currentFolder.name : "Home";
  const folderData = {
    name: document.getElementById("cf-folderName").value,
    parent: currentFolder.id,
  };

  // if (folderName.trim() === "") {
  //     return;
  // }
  fetch(currentFolder.id ? `/folders/${currentFolder.id}/` : "/folders/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify(folderData),
  })
    .then((response) =>
      response.ok
        ? fetchFilesAndFolders(currentFolder.id)
        : handleFolderError(response)
    )
    .then((data) => {
      // alert("Folder created successfully: " + data.name);
      console.log(currentFolder.id);
      fetchFilesAndFolders(currentFolder.id);
      // fetchFolders();
      // if (data.folder) {
      //     // showNotification(data.folder.name);
      //     alert("Folder created successfully: " + data.name);
      //   fetchFolders();
      // }
      let modal = bootstrap.Modal.getInstance(
        document.getElementById("cf-createFolderModal")
      );
      modal.hide();
    })
    .catch((error) => {
      showErrorModal(
        "Duplicate Folder", // Title
        "A folder with this name already exists in this location.", // Message
        `<b>Folder name: ${folderName}<br><br>Parent folder: ${parentFolder}</b>` // Details
      );
    });
}

document
  .getElementById("cf-createButton")
  .addEventListener("click", createFolder);
document
  .getElementById("cf-createFolderModal")
  .addEventListener("hidden.bs.modal", function () {
    document.getElementById("cf-folderName").value = "";
  });
// Fetch and display folders
function fetchFolders() {
  fetch("/folders/")
    .then((response) => response.json())
    .then((data) => {
      // Assuming data.folders contains the list of folders
      if (data.folders && data.folders.length > 0) {
        console.log(data.folders);
        // Call fetchFilesAndFolders() with the folder ID of the first folder
        fetchFilesAndFolders(data.folders[0].id);

        // Reset the folder input field (if needed)
        document.getElementById("cf-folderName").value = "";

        // Populate dropdown with folder options
        data.folders.forEach((folder) => {
          const option = document.createElement("option");
          option.value = folder.id;
          option.textContent = folder.name;
          folderSelect.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error fetching folders:", error));
}

// Fetch files and folders, and display them sorted by latest added
function fetchFilesAndFolders(
  folderId = null,
  starred = false,
  archived = false
) {
  // console.log(folderId);
  let url = folderId ? `/folder-contents/${folderId}/` : "/folder-contents/"; // Default URL for all folders
  console.log("Fetching from:", url);
  // If we are viewing archived files
  if (archived) {
    url = "/file-upload/"; // Set base URL for archived files
  }

  // Append the 'starred' query parameter if needed
  if (starred) {
    url += url.includes("?") ? "&starred=true" : "?starred=true"; // Add query param without overwriting
  }

  // Append the 'archived' query parameter if needed (it will already be present if we're in archived view)
  if (archived && !url.includes("archived=true")) {
    url += url.includes("?") ? "&archived=true" : "?archived=true"; // Add query param without overwriting
  }

  console.log("Fetching from URL:", url);
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      console.log("Raw response data:", data);
      if (!data.files || !data.folders) {
        console.error("Unexpected API response format:", data);
        return;
      }

      currentFolder.id = data.current_folder ? data.current_folder : null;
      const currentEmail = data.current_email;
      const current_first_name = data.current_first_name;
      console.log(currentEmail, current_first_name);
      document.getElementById("user-name").innerText = current_first_name;
      renderFilesAndFolders({
        files: data.files,
        folders: data.folders,
        currentEmail: currentEmail,
      });
      document.getElementById("myFilesCount").innerText = data.files.length;
    })
    .catch((error) => {
      console.error("Error fetching files and folders:", error);
      showErrorModal("Load Error", "Failed to load folder contents", error);
    });
}

function renderFilesAndFolders({ folders = [], files = [], currentEmail }) {
  const combinedData = [...folders, ...files];

  // Sort folders and files separately
  folders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort folders
  files.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)); // Sort files

  // Combine them again after sorting
  const sortedData = [...folders, ...files];

  // console.log("Sorted Data:", sortedData);
  updateTable(sortedData, currentEmail);
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return "--";
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (!bytes) return "--";
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}

// Helper function to get file icons
function getFileIcon(fileType) {
  const fileIcons = {
    pdf: "fas fa-file-pdf text-danger",
    doc: "fas fa-file-word text-primary",
    docx: "fas fa-file-word text-primary",
    xls: "fas fa-file-excel text-success",
    xlsx: "fas fa-file-excel text-success",
    ppt: "fas fa-file-powerpoint text-warning",
    pptx: "fas fa-file-powerpoint text-warning",
    txt: "fas fa-file-alt text-muted",
    rtf: "fas fa-file-alt text-muted",
    odt: "fas fa-file-word text-primary",
    ods: "fas fa-file-excel text-success",
    odp: "fas fa-file-powerpoint text-warning",
    csv: "fas fa-file-csv text-success",
    json: "fas fa-file-code text-info",
    xml: "fas fa-file-code text-info",
    zip: "fas fa-file-archive text-secondary",
    default: "fas fa-file text-muted",
  };
  return fileIcons[fileType] || fileIcons["default"];
}

function generateActionButton(fileId, fileName) {
  return `
    <td class="position-relative">
      <div class="dropdown">
        <button class="btn btn-light" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="fa fa-ellipsis-v"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end file-action-dropdown">
          <li><a class="dropdown-item" href="#" onclick="viewFile(${fileId})"><i class="fa fa-eye mx-2"></i> View</a></li>
          <li><a class="dropdown-item" href="#" onclick="editFile(${fileId})"><i class="fa fa-pen mx-2"></i> Edit</a></li>
          <li><a class="dropdown-item" href="#" onclick="downloadFile(${fileId})"><i class="fa fa-download mx-2"></i> Download</a></li>
          <li><a class="dropdown-item" href="#" onclick="openCustomModal(${fileId})"><i class="fa fa-share-alt mx-2"></i> Share</a></li>
          <li><a class="dropdown-item" href="#" onclick="favoriteFile(${fileId})"><i class="fa fa-bookmark mx-2"></i> Favorite</a></li>
          <li><a class="dropdown-item" href="#" onclick="uploadNewVersion(${fileId})"><i class="fa fa-upload mx-2"></i> Upload New Version</a></li>
          <li><a class="dropdown-item" href="#" onclick="viewVersionHistory(${fileId})"><i class="fa fa-history mx-2"></i> Version History</a></li>
          <li><a class="dropdown-item" href="#" onclick="commentOnFile(${fileId})"><i class="fa fa-comment mx-2"></i> Comment</a></li>
          <li><a class="dropdown-item" href="#" onclick="addReminder(${fileId})"><i class="fa fa-bell mx-2"></i> Add Reminder</a></li>
          <li><a class="dropdown-item" href="#" onclick="openModal(${fileId})"><i class="fa fa-envelope mx-2"></i> Send Email</a></li>
          <li><a class="dropdown-item" href="#" onclick="archiveFile(${fileId}, '${fileName}')"><i class="fa fa-archive mx-2"></i> Archive</a></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="deleteFile(${fileId})"><i class="fa fa-trash mx-2"></i> Delete</a></li>
        </ul>
      </div>
    </td>
  `;
}

function updateTable(files, currentEmail) {
  let tableBody = document.querySelector("table tbody");
  tableBody.innerHTML = ""; // Clear existing content
  // const cu = response.current_email;
  // console.log(currentEmail);

  files.forEach((file) => {
    const isFolder = file.hasOwnProperty("created_at"); // Determine if it's a folder
    const itemIconClass = isFolder
      ? "fa fa-folder text-primary"
      : getFileIcon(file.file_type);
    const formattedDate = formatDate(
      isFolder ? file.created_at : file.uploaded_at
    );
    const formattedFileSize = isFolder ? "--" : formatFileSize(file.file_size);
    const category = isFolder
      ? "--"
      : file.category
      ? file.category.name
      : "--";

    let ownerDisplay =
      file.owner_email === currentEmail ? "me" : file.owner_email;
    // console.log(file.owner_email);

    let row = `<tr class="${isFolder ? "folder-row" : "file-row"}">
    <td class="name-col">
  <i class="${itemIconClass} file-icon"></i> 
  <span class="text-muted" 
        onclick="${
          isFolder
            ? `handleFolderClick(${file.id}, '${file.name}')`
            : `viewFile(${file.id})`
        }">
    ${file.name}
  </span>
</td>

       <td class="${file.is_archived ? "hidden" : ""}">
    <i class="${file.is_starred ? "fas starred" : "far"} fa-star" 
       title="Star this ${isFolder ? "folder" : "file"}" 
       onclick="toggleStar(${file.id}, '${
      isFolder ? "folder" : "file"
    }', this, '${file.name}')"></i>
  </td>
      <td>${ownerDisplay}</td>
      <td>${category}</td>  
      <td>${formattedDate}</td>
      <td>${formattedFileSize}</td>
       <td>
      ${
        !isFolder
          ? file.is_archived
            ? `<i class="fas fa-undo text-primary" title="Unarchive this file"
               onclick="archiveFile(${file.id}, '${file.name}')"></i>`
            : generateActionButton(file.id, file.name)
          : ""
      }
    </td>

    </tr>`;

    tableBody.innerHTML += row;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const tableBody = document.querySelector("#file-table-section tbody");
  const actionBar = document.getElementById("actionBar");
  const selectedCount = document.getElementById("selected-count");
  const clearSelectionBtn = document.querySelector(".clear-selection");

  let selectedRows = new Set(); // Track selected rows

  // Handle row click for selection (excluding folders)
  tableBody.addEventListener("click", function (event) {
    const row = event.target.closest("tr"); // Get the clicked row
    if (!row || row.classList.contains("folder-row")) return; // Ignore folder rows

    const rowIndex = row.dataset.index; // Use a data attribute for row index

    if (event.ctrlKey || event.metaKey) {
      // Multi-select (Ctrl or Cmd)
      if (selectedRows.has(rowIndex)) {
        row.classList.remove("selected");
        selectedRows.delete(rowIndex);
      } else {
        row.classList.add("selected");
        selectedRows.add(rowIndex);
      }
    } else {
      // Single select (deselect others)
      document
        .querySelectorAll("#file-table-section tbody tr.selected")
        .forEach((el) => {
          el.classList.remove("selected");
        });
      selectedRows.clear();

      row.classList.add("selected");
      selectedRows.add(rowIndex);
    }

    // Show or hide action bar
    if (selectedRows.size > 0) {
      console.log("size:", selectedRows.size);
      actionBar.style.cssText = "display: flex !important;";
      selectedCount.textContent = `${selectedRows.size} selected`;
    } else {
      actionBar.style.display = "none";
    }

    event.stopPropagation(); // Prevent bubbling
  });

  // Click outside to clear selection
  // document.addEventListener("click", function (event) {
  //   if (!event.target.closest("#file-table-section")) {
  //     document
  //       .querySelectorAll("#file-table-section tbody tr.selected")
  //       .forEach((el) => {
  //         el.classList.remove("selected");
  //       });
  //     selectedRows.clear();
  //     actionBar.style.display = "none";
  //   }
  // });

  // Clear selection button
  clearSelectionBtn.addEventListener("click", function () {
    document
      .querySelectorAll("#file-table-section tbody tr.selected")
      .forEach((el) => {
        el.classList.remove("selected");
      });
    selectedRows.clear();
    actionBar.style.display = "none";
  });
});

// Function to format file size into KB, MB, etc.
// function formatFileSize(bytes) {
//   if (bytes === 0) return "0 B";
//   let sizes = ["B", "KB", "MB", "GB", "TB"];
//   let i = Math.floor(Math.log(bytes) / Math.log(1024));
//   return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
// }

// Initial fetch for files and folders on page load

// Function to check if files exist and update UI
function checkIfFilesExist() {
  const folderId = currentFolder?.id || ""; // Use empty string if no folder
  const uploadUrl = folderId ? `/file-upload/${folderId}/` : "/file-upload/";

  console.log("Fetching from:", uploadUrl);

  fetch(uploadUrl)
    .then((response) => response.json())
    .then((data) => {
      console.log("Raw response data:", data);

      if (!data.files || !Array.isArray(data.files)) {
        console.error("Unexpected response format:", data);
        return;
      }

      console.log("Files found:", data.files.length);

      if (data.files.length > 0) {
        document.getElementById("upload-section").style.display = "none";
        document.getElementById("file-table-section").style.display = "block";
        // updateTable([...data.folders, ...data.files]);
        fetchFilesAndFolders(currentFolder.id);
      } else {
        document.getElementById("upload-section").style.display = "block";
        document.getElementById("file-table-section").style.display = "none";
      }
    })
    .catch((error) => console.error("Error fetching files:", error));
}

checkIfFilesExist();

function showNotification(itemNames, action) {
  const notification = document.getElementById("upload-notification");
  const messageElement = document.getElementById("notification-message");

  if (messageElement) {
    // Construct the message based on the action
    let message = "";
    if (action === "starred") {
      message = `${itemNames.join(", ")} starred successfully.`;
    } else if (action === "unstarred") {
      message = `${itemNames.join(", ")} unstarred successfully.`;
    } else if (action === "uploaded") {
      message = `${itemNames.join(", ")} uploaded successfully to My Files.`;
    } else if (action === "archived") {
      message = `${itemNames.join(", ")} archived successfully.`;
    } else if (action === "unarchived") {
      message = `${itemNames.join(", ")} unarchived successfully.`;
    } else if (action === "shared") {
      message = `Shared successfully!`;
    } else if (action === "email") {
      message = itemNames;
    }

    // Update only the message text
    messageElement.textContent = message;
  }

  notification.classList.remove("notify");

  setTimeout(() => {
    notification.classList.add("notify");
  }, 5000); // Hide after 5 seconds
}

// Function to handle drag events on Dropzone
window.onload = function () {
  const dropzoneElement = document.getElementById("dropZoneArea");

  if (dropzoneElement) {
    dropzoneElement.addEventListener("dragenter", function () {
      dropzoneElement.classList.add("dragging");
      console.log("Drag started");
    });

    dropzoneElement.addEventListener("dragover", function (e) {
      e.preventDefault(); // Allows the file to be dropped
    });

    // Remove the class *only* when a file is dropped, not when leaving the drop zone
    dropzoneElement.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzoneElement.classList.remove("dragging");
      console.log("File dropped, removing background");
    });
  } else {
    console.error("Dropzone element not found!");
  }
};

window.onload = function () {
  const dropzoneElement = document.getElementById("dropZoneArea");

  if (dropzoneElement) {
    dropzoneElement.addEventListener("dragenter", function () {
      dropzoneElement.classList.add("dragging");
    });

    dropzoneElement.addEventListener("dragover", function (e) {
      e.preventDefault(); // Allows the file to be dropped
    });

    // Remove the class only when a file is dropped
    dropzoneElement.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzoneElement.classList.remove("dragging");
      console.log("File dropped, removing background");
    });

    // Remove the background when clicking outside the drop zone
    document.addEventListener("click", function (e) {
      if (!dropzoneElement.contains(e.target)) {
        dropzoneElement.classList.remove("dragging");
      }
    });
  } else {
    console.error("Dropzone element not found!");
  }
};

// Modified Navigate Function

let folderPath = []; // Stores folder hierarchy

function navigateToFolder(folderId, folderName) {
  if (folderId === null) {
    // Reset to root
    folderPath = [];
  } else {
    // Find if the folder already exists in the path
    const existingIndex = folderPath.findIndex((f) => f.id === folderId);

    if (existingIndex >= 0) {
      // If folder already exists, truncate path to avoid duplicates
      folderPath = folderPath.slice(0, existingIndex + 1);
    } else {
      // Add new folder to the path
      folderPath.push({ id: folderId, name: folderName });
    }
  }
  currentFolder.name = folderName;
  // Update UI
  updateBreadcrumbs();
  fetchFilesAndFolders(folderId);
}

function updateBreadcrumbs() {
  const breadcrumbs = document.getElementById("breadcrumbs");
  breadcrumbs.innerHTML = ""; // Clear previous breadcrumbs

  // Add Home as the first breadcrumb
  const homeLi = document.createElement("li");
  homeLi.className = "nav-home";
  homeLi.innerHTML = `<a href="#" onclick="navigateToFolder(null, 'Home')">
                          <i class="icon-home"></i>
                      </a>`;
  breadcrumbs.appendChild(homeLi);

  // Loop through folderPath to create breadcrumbs
  folderPath.forEach((folder, index) => {
    const separator = document.createElement("li");
    separator.className = "separator";
    separator.innerHTML = '<i class="icon-arrow-right"></i>';
    breadcrumbs.appendChild(separator);

    const li = document.createElement("li");
    li.className = "nav-item op-7 mb-2";

    if (index === folderPath.length - 1) {
      // Last item (current folder) - not clickable
      li.textContent = folder.name;
    } else {
      // Clickable breadcrumb items
      li.innerHTML = `<a href="#" onclick="navigateToFolder(${folder.id}, '${folder.name}')">${folder.name}</a>`;
    }

    breadcrumbs.appendChild(li);
  });
}

function handleFolderClick(folderId, folderName) {
  navigateToFolder(folderId, folderName);
}

function downloadFile(fileId) {
  const downloadUrl = `/download-file/${fileId}/`;

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.setAttribute("download", ""); // Ensures it downloads, not opens
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function viewFile(fileId) {
  // Create the URL to the file (using Django view to serve the file)
  const viewUrl = `/view-file/${fileId}/`; // The URL to download or open the file

  // Create an anchor element to trigger the file open
  const a = document.createElement("a");
  a.href = viewUrl;
  a.setAttribute("target", "_blank"); // Open in a new tab, or default app on the device
  document.body.appendChild(a); // Append to the DOM
  a.click(); // Trigger the file to open

  // Clean up by removing the element
  document.body.removeChild(a);
}

let selectedFileId = null;
// Function to open the modal
function openCustomModal(fileId) {
  selectedFileId = fileId;

  const overlay = document.getElementById("customModalOverlay");
  overlay.classList.add("active");
}
window.openCustomModal = openCustomModal;
// Function to close the modal
function closeCustomModal() {
  document.getElementById("shareForm").reset();
  const overlay = document.getElementById("customModalOverlay");
  overlay.classList.remove("active");
}
window.closeCustomModal = closeCustomModal;

// Close modal when clicking outside the modal card
window.onclick = function (event) {
  const overlay = document.getElementById("customModalOverlay");
  if (event.target === overlay) {
    closeCustomModal();
  }
};

function getCookie(name) {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

function toggleStar(objectId, objectType, starIcon, itemName) {
  const url =
    objectType === "file"
      ? `/files/${objectId}/toggle-star/`
      : `/folders/${objectId}/toggle-star/`; // Different URL for folders

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.is_starred !== undefined) {
        // Toggle the star class based on the new starred status
        if (data.is_starred) {
          starIcon.classList.remove("far");
          starIcon.classList.add("fas", "starred");
          // Notify with 'Starred' message
          showNotification([itemName], "starred");
        } else {
          starIcon.classList.remove("fas", "starred");
          starIcon.classList.add("far");
          // Notify with 'Unstarred' message
          showNotification([itemName], "unstarred");
        }
      } else {
        console.error("Error toggling star:", data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
window.toggleStar = toggleStar;

function archiveFile(fileId, fileName) {
  fetch(`/files/${fileId}/toggle-archive/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      showNotification(
        [fileName],
        data.is_archived ? "archived" : "unarchived"
      );
      const folderId =
        currentFolder && currentFolder.id ? currentFolder.id : null;
      if (data.is_archived) {
        fetchFilesAndFolders(folderId, false, false);
      } else {
        fetchFilesAndFolders(null, false, true);
      }

      // Create a MutationObserver to wait for the new row to appear
      const observer = new MutationObserver(() => {
        const fileRow = document.getElementById(`file-row-${fileId}`);
        if (fileRow) {
          observer.disconnect(); // Stop watching once found

          const starIcon = fileRow.querySelector(".fa-star");
          const actionButton = fileRow.querySelector(".action-button");
          const unarchiveIcon = fileRow.querySelector(".fa-undo");

          if (data.is_archived) {
            if (starIcon) starIcon.classList.add("d-none");
            if (actionButton) actionButton.classList.add("d-none");
            if (unarchiveIcon) unarchiveIcon.classList.remove("d-none");
          } else {
            if (starIcon) starIcon.classList.remove("d-none");
            if (actionButton) actionButton.classList.remove("d-none");
            if (unarchiveIcon) unarchiveIcon.classList.add("d-none");
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    })
    .catch((error) => console.error("Error:", error));
}
window.archiveFile = archiveFile;

document.addEventListener("DOMContentLoaded", function () {
  const starredBtn = document.querySelector("#starred-button");

  let showOnlyStarred = false; // Track state

  starredBtn.addEventListener("click", function () {
    showOnlyStarred = !showOnlyStarred; // Toggle state

    const folderId =
      currentFolder && currentFolder.id ? currentFolder.id : null;

    // Fetch starred files if active, otherwise fetch all
    fetchFilesAndFolders(folderId, showOnlyStarred);

    // Update button style dynamically
    if (showOnlyStarred) {
      starredBtn.classList.add("active-starred");
    } else {
      starredBtn.classList.remove("active-starred");
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const archiveBtn = document.querySelector("#archive-button");

  let showOnlyArchived = false; // Track state

  archiveBtn.addEventListener("click", function () {
    showOnlyArchived = !showOnlyArchived; // Toggle state

    // Determine folder ID: use currentFolder.id if available, otherwise pass null
    const folderId =
      currentFolder && currentFolder.id ? currentFolder.id : null;

    // Fetch files and folders with archive filter
    fetchFilesAndFolders(folderId, false, showOnlyArchived);

    // Update button style dynamically to indicate active state
    if (showOnlyArchived) {
      archiveBtn.classList.add("active-archive"); // Custom class for active state
    } else {
      archiveBtn.classList.remove("active-archive");
    }
  });
});

// Search Functionality
document.getElementById("searchInput").addEventListener("input", function () {
  let searchQuery = this.value.toLowerCase();
  let rows = document.querySelectorAll("table tbody tr");

  rows.forEach((row) => {
    let fileName = row
      .querySelector(".name-col span")
      .textContent.toLowerCase();
    let fileCategory = row.cells[3]?.textContent.toLowerCase() || ""; // Category Column
    let fileDate = row.cells[4]?.textContent.toLowerCase() || ""; // Date Column

    if (
      fileName.includes(searchQuery) ||
      fileCategory.includes(searchQuery) ||
      fileDate.includes(searchQuery)
    ) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});

// document
//   .getElementById("shareForm")
//   .addEventListener("submit", async function (e) {
//     e.preventDefault();

//     const email = document.getElementById("email").value.trim();
//     const message = document.getElementById("message").value.trim();

//     try {
//       const response = await fetch("/api/share/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]")
//             .value,
//         },
//         body: JSON.stringify({
//           id: selectedFileId,
//           email: email,
//           message: message,
//         }),
//       });

//       if (response.ok) {
//         // alert("Shared successfully!");
//         showNotification("File", "shared");
//         closeCustomModal();
//       } else {
//         const errorData = await response.json();
//         alert("Error: " + (errorData.detail || "Something went wrong"));
//       }
//     } catch (err) {
//       alert("Network error: " + err.message);
//     }
//   });
document
  .getElementById("shareForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const rawEmails = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();
    const emailList = rawEmails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email !== "");

    if (emailList.length === 0) {
      Swal.fire(
        "Validation Error",
        "Please enter at least one email.",
        "warning"
      );
      return;
    }

    try {
      await performAction({
        url: "/api/share/",
        method: "POST",
        data: {
          id: selectedFileId,
          emails: emailList, // send the list
          message: message,
        },
        successMessage: "File shared with selected recipients!",
        errorMessage: "Failed to share file.",
      });

      document.getElementById("shareForm").reset();
      closeCustomModal();
    } catch (err) {
      // Error already handled by performAction
    }
  });

document
  .getElementById("sharedWithMeLink")
  .addEventListener("click", function (e) {
    e.preventDefault();
    loadSharedWithMe(); // Load and display shared files
  });

function loadSharedWithMe() {
  fetch("/api/shared-with-me/")
    .then((res) => res.json())
    .then((data) => {
      updateSharedTable(data.files); // This fills the shared-with-me table

      // Show the shared-with-me section and hide the rest
      document.getElementById("shared-with-me-section").style.display = "block";
      document.getElementById("file-table-section").style.display = "none";

      // Update the badge count
      document.getElementById("sharedWithMeCount").innerText =
        data.files.length;
      markSharedFilesAsSeen();
    })
    .catch((err) => console.error("Failed to load shared files:", err));
}

function updateSharedTable(sharedFiles) {
  const tableBody = document.getElementById("shared-with-me-table-body");
  tableBody.innerHTML = "";

  sharedFiles.forEach((entry) => {
    const file = entry.file;
    const fileIcon = getFileIcon(file.file_type);
    const formattedDate = formatDate(entry.shared_at);
    // const fileSize = formatFileSize(file.file_size);

    const row = `
      <tr>
      <td class="name-col">
  <i class="${fileIcon} file-icon"></i>
  <span class="text-muted" 
        onclick="viewFile(${file.id})" style="cursor:pointer">${file.name}
  </span>
</td>
        
        <td>${entry.shared_by}</td>
        <td>${formattedDate}</td>
        <td>${entry.message || "--"}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  });
}

function updateSharedNotificationCount() {
  fetch("/api/shared-with-me/unseen-count/")
    .then((res) => res.json())
    .then((data) => {
      const badge = document.getElementById("sharedWithMeCount");
      if (data.count > 0) {
        badge.innerText = data.count;
        badge.style.display = "inline-block";
      } else {
        badge.innerText = "";
        badge.style.display = "none";
      }
    })
    .catch((err) => console.error("Notification count fetch failed", err));
}

document.addEventListener("DOMContentLoaded", updateSharedNotificationCount);
function markSharedFilesAsSeen() {
  fetch("/api/shared-with-me/mark-seen/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to mark files as seen.");
      }
      // Reset badge after marking seen
      document.getElementById("sharedWithMeCount").innerText = "";
    })
    .catch((err) => {
      console.error("Error marking shared files as seen:", err);
    });
}

function editFile(fileId) {
  fetch("/get-categories/")
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById("edit-category");
      select.innerHTML = "";
      data.categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    });

  fetch(`/files-update/${fileId}/`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("access_token"), // if using JWT
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Populate modal fields
      document.getElementById("edit-name").value = data.name;
      document.getElementById("edit-category").value = data.category.id; // assumes category object has an id
      document.getElementById("edit-tags").value = data.meta_tags
        .map((tag) => tag.name)
        .join(", ");
      document.getElementById("edit-is-public").checked = data.is_public;

      // Store file ID in a hidden field or global variable
      document
        .getElementById("edit-file-form")
        .setAttribute("data-file-id", fileId);

      // Show modal
      let modal = new bootstrap.Modal(document.getElementById("editFileModal"));
      modal.show();
    })
    .catch((error) => console.error("Error fetching file data:", error));
}
window.editFile = editFile;

document.getElementById("save-edit-btn").addEventListener("click", function () {
  const fileId = document
    .getElementById("edit-file-form")
    .getAttribute("data-file-id");

  const name = document.getElementById("edit-name").value;
  const category_id = document.getElementById("edit-category").value;
  const tags = document
    .getElementById("edit-tags")
    .value.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
  const is_public = document.getElementById("edit-is-public").checked;

  const payload = {
    name: name,
    category_id: category_id,
    meta_tag_names: tags,
    is_public: is_public,
  };

  fetch(`/file/update/${fileId}/`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 403) {
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("editFileModal")
          );
          modal.hide();
          throw new Error("You do not have permission to update this file.");
        } else {
          throw new Error("An unexpected error occurred while updating.");
        }
      }
      return response.json();
    })
    .then((data) => {
      location.reload();
    })
    .catch((error) => {
      showErrorMessage(error.message);
    });
});

function showErrorMessage(message) {
  const alertContainer = document.getElementById("alert-container");

  // Clear existing alerts
  alertContainer.innerHTML = "";

  // Create the alert element
  const alertElement = document.createElement("div");
  alertElement.className = "alert alert-dismissible fade show";
  alertElement.setAttribute("role", "alert");
  alertElement.setAttribute(
    "style",
    `
    background-color: #f8d7da;         /* Soft pinkish red */
    color: #842029;                    /* Dark red text */
    border: 1px solid #f5c2c7;
    box-shadow: 0 0.5rem 1rem rgba(220, 53, 69, 0.1);
  `
  );

  alertElement.innerHTML = `
    <strong>Access Denied:</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  alertContainer.appendChild(alertElement);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    const alert = bootstrap.Alert.getOrCreateInstance(alertElement);
    alert.close();
  }, 4000);
}

let selected_FileId = null;

function openModal(fileId) {
  selected_FileId = fileId;

  const overlay = document.getElementById("emailShareModal");
  overlay.classList.add("active");
}
window.openModal = openModal;
// Function to close the modal
function closeModal() {
  const overlay = document.getElementById("emailShareModal");
  overlay.classList.remove("active");
}
window.closeModal = closeModal;

document
  .getElementById("emailShareForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const recipient = document.getElementById("email_send").value;
    const recipientList = recipient
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email !== "");
    const message = document.getElementById("emailMessage").value;

    //   fetch("/send-email/", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "X-CSRFToken": getCSRFToken(),
    //     },
    //     body: JSON.stringify({
    //       recipients: recipientList,
    //       message: message,
    //       file_id: selected_FileId,
    //     }),
    //   })
    //     .then((response) => response.json())
    //     .then((data) => {
    //       // alert(data.success || data.error);
    //       showNotification(data.success || data.error, "email");
    //       document.getElementById("emailShareForm").reset();
    //       closeModal("emailShareModal");
    //     })
    //     .catch((error) => {
    //       console.error("Error:", error);
    //       alert("Failed to send email.");
    //     });
    // });
    performAction({
      url: "/send-email/",
      data: {
        recipients: recipientList,
        message: message,
        file_id: selected_FileId,
      },
      successMessage: "Email sent successfully!",
      errorMessage: "Failed to send email.",
    }).then(() => {
      document.getElementById("emailShareForm").reset();
      closeModal("emailShareModal");
    });
  });
