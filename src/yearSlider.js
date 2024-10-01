// yearSlider.js

let currentYear = 2023; // Default to 2023 or whatever your initial year is

export function initializeYearSlider() {
  const yearSlider = document.getElementById("yearSlider");
  const currentYearSpan = document.getElementById("currentYear");

  yearSlider.addEventListener("input", function () {
    currentYear = parseInt(this.value);
    currentYearSpan.textContent = currentYear;
    console.log("Current Year:", currentYear);
    // You can add additional logic here to update your visualization based on the selected year
  });
}

export function getCurrentYear() {
  return currentYear;
}
