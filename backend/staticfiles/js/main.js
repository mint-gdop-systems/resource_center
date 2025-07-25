// pie chart
var pieChart = document.getElementById("myPieChart").getContext("2d");

var myPieChart = new Chart(pieChart, {
  type: "pie",
  data: {
    datasets: [
      {
        data: [40, 30, 15, 10, 5], // Percentages of each resource category
        backgroundColor: [
          "#1d7af3",
          "#f3545d",
          "#fdaf4b",
          "#5cc85c",
          "#dfe4ea",
        ], // Colors for each segment
        borderWidth: 0,
      },
    ],
    labels: [
      "Forms", // 40% for Forms
      "Templates", // 30% for Templates
      "Guidelines & Manuals", // 15% for Guidelines & Manuals
      "Reports", // 10% for Reports
      "Miscellaneous Resources", // 5% for Miscellaneous Resources
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: "bottom", // Positioning the legend at the bottom
      labels: {
        fontColor: "rgb(154, 154, 154)", // Font color of the labels
        fontSize: 11,
        usePointStyle: true,
        padding: 20,
      },
    },
    pieceLabel: {
      render: "percentage", // Render the percentage on the pie chart
      fontColor: "white", // Font color of the percentage labels
      fontSize: 14,
    },
    tooltips: {
      enabled: false, // Disabling tooltips
    },
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
      },
    },
  },
});

// bar chart
var barChart = document.getElementById("myBarChart").getContext("2d");

var myBarChart = new Chart(barChart, {
  type: "bar", // Bar chart type
  data: {
    labels: ["Admin", "Tech & Innov", "Proj Mgmt", "Legal", "HR", "Finance"],
    // Departments
    datasets: [
      {
        label: "Document Accesses", // Label for the dataset
        backgroundColor: "rgb(23, 125, 255)", // Bar color
        borderColor: "rgb(23, 125, 255)", // Border color
        data: [120, 200, 150, 130, 180, 220], // Document accesses for each department
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      yAxes: [
        {
          ticks: {
            beginAtZero: false, // Disable starting from zero
            min: 100, // Force the Y-axis to start at 100
          },
        },
      ],
      xAxes: [
        {
          ticks: {
            fontSize: 11, // Decrease font size
            autoSkip: false,
          },
        },
      ],
    },
  },
});
