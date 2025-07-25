$(document).ready(function () {
  var table = $("#google-drive-style").DataTable({
    pageLength: 10,
    dom: "<'d-flex justify-content-between align-items-center'>t<'d-flex justify-content-between align-items-center'lip>",

    columnDefs: [
      { orderable: false, targets: [0, 6] },
      // Disable sorting on icons/actions columns
    ],
    lengthMenu: [
      [5, 10, 25, 50, -1],
      [5, 10, 25, 50, "All"],
    ],
    initComplete: function () {
      this.api()
        .columns()
        .every(function () {
          var column = this;
          var footer = $(column.footer());

          var columnIndex = column.index();

          // Skip columns you don't want dropdowns for (e.g., column 3 - Action column)
          if ([0, 1, 4, 5, 6].includes(columnIndex)) return;

          if (footer.length) {
            var select = $(
              '<select class="form-select"><option value="">All</option></select>'
            )
              .appendTo(footer.empty()) // Clear existing and append
              .on("change", function () {
                var val = $.fn.dataTable.util.escapeRegex($(this).val());

                column.search(val ? "^" + val + "$" : "", true, false).draw();
              });

            column
              .data()
              .unique()
              .sort()
              .each(function (d, j) {
                select.append('<option value="' + d + '">' + d + "</option>");
              });
          }
        });
    },
  });
  $("#searchInput").on("keyup", function () {
    table.search(this.value).draw();
  });

  var action =
    '<td> <div class="form-button-action"> <button type="button" data-bs-toggle="tooltip" title="" class="btn btn-link btn-primary btn-lg" data-original-title="Edit Task"> <i class="fa fa-edit"></i> </button> <button type="button" data-bs-toggle="tooltip" title="" class="btn btn-link btn-danger" data-original-title="Remove"> <i class="fa fa-times"></i> </button> </div> </td>';

  $("#addRowButton").click(function () {
    $("#add-row")
      .dataTable()
      .fnAddData([
        $("#addName").val(),
        $("#addPosition").val(),
        $("#addOffice").val(),
        action,
      ]);
    $("#addRowModal").modal("hide");
  });

  flatpickr("#date-filter", {
    dateFormat: "Y-m-d", // Flatpickr date format
    allowInput: true, // Enables manual input
    onChange: function (selectedDates, dateStr) {
      if (selectedDates.length > 0) {
        // Convert selected date to "Jan 10, 2024" format
        const selectedDate = selectedDates[0];
        const options = {
          year: "numeric",
          month: "short",
          day: "numeric",
        };
        const formattedDate = selectedDate.toLocaleDateString("en-US", options);

        // Apply filter to the date column (adjust column index if needed)
        table.column(4).search(formattedDate).draw();
      } else {
        // Clear filter if no date is selected
        table.column(4).search("").draw();
      }
    },
  });

  // row selection
  var selectedRows = new Set(); // Track selected rows
  var actionBar = $("#actionBar");
  var selectedCount = $("#selected-count");

  // Handle row click for selection
  $("#google-drive-style tbody").on("click", "tr", function (event) {
    var rowIndex = table.row(this).index(); // Get row index

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl or Cmd key
      if ($(this).hasClass("selected")) {
        $(this).removeClass("selected");
        selectedRows.delete(rowIndex);
      } else {
        $(this).addClass("selected");
        selectedRows.add(rowIndex);
      }
    } else {
      // Single-select (deselect all other rows)
      $("#google-drive-style tbody tr.selected").removeClass("selected");
      selectedRows.clear();

      $(this).addClass("selected");
      selectedRows.add(rowIndex);
    }

    // Update the action bar
    if (selectedRows.size > 0) {
      actionBar.attr("style", "display: flex !important;"); // Show the action bar
      selectedCount.text(`${selectedRows.size} selected`);
    } else {
      actionBar.attr("style", "display: none !important;"); // Hide the action bar
    }

    event.stopPropagation(); // Prevent event from bubbling to document
  });

  $("#google-drive-style").on("click", function (event) {
    // Check if the click target is not a selected row
    if (!$(event.target).closest("tr.selected").length) {
      // Deselect all rows and hide the action bar
      $("#google-drive-style tbody tr.selected").removeClass("selected");
      selectedRows.clear();
      actionBar.css("display", "none");
    }
  });

  // Prevent document click from triggering when clicking inside the table
  $("#google-drive-style").on("click", function (event) {
    event.stopPropagation(); // Prevent the document click event
  });

  // Handle "clear selection" button click
  $(".clear-selection").on("click", function () {
    $("#google-drive-style tbody tr.selected").removeClass("selected");
    selectedRows.clear();
    actionBar.css("display", "none");
  });
});
