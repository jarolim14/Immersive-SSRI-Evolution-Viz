import { CONFIG } from "./config.js";

export function getCurrentYearRange() {
  const fromValue = document.getElementById("fromValue");
  const toValue = document.getElementById("toValue");
  return [parseInt(fromValue.textContent), parseInt(toValue.textContent)];
}

export function initializeYearSlider(container, onYearChange) {
  const fromSlider = document.getElementById("fromSlider");
  const toSlider = document.getElementById("toSlider");
  const fromValue = document.getElementById("fromValue");
  const toValue = document.getElementById("toValue");

  function controlFromSlider(fromSlider, toSlider) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
    if (from > to) {
      fromSlider.value = to;
      fromValue.textContent = to;
    } else {
      fromValue.textContent = from;
    }

    // Dispatch event immediately
    dispatchYearUpdatedEvent();
  }

  function controlToSlider(fromSlider, toSlider) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
    setToggleAccessible(toSlider);
    if (from <= to) {
      toSlider.value = to;
      toValue.textContent = to;
    } else {
      toValue.textContent = from;
      toSlider.value = from;
    }

    // Dispatch event immediately
    dispatchYearUpdatedEvent();
  }

  function getParsed(currentFrom, currentTo) {
    const from = parseInt(currentFrom.value, 10);
    const to = parseInt(currentTo.value, 10);
    return [from, to];
  }

  function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
    const rangeDistance = to.max - to.min;
    const fromPosition = from.value - to.min;
    const toPosition = to.value - to.min;
    controlSlider.style.background = `linear-gradient(
      to right,
      ${sliderColor} 0%,
      ${sliderColor} ${(fromPosition / rangeDistance) * 100}%,
      ${rangeColor} ${(fromPosition / rangeDistance) * 100}%,
      ${rangeColor} ${(toPosition / rangeDistance) * 100}%,
      ${sliderColor} ${(toPosition / rangeDistance) * 100}%,
      ${sliderColor} 100%)`;
  }

  function setToggleAccessible(currentTarget) {
    const toSlider = document.querySelector("#toSlider");
    if (Number(currentTarget.value) <= 0) {
      toSlider.style.zIndex = 2;
    } else {
      toSlider.style.zIndex = 0;
    }
  }

  fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
  setToggleAccessible(toSlider);

  fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider);
  toSlider.oninput = () => controlToSlider(fromSlider, toSlider);

  // Initialize values
  fromValue.textContent = fromSlider.value;
  toValue.textContent = toSlider.value;

  // Trigger initial update
  dispatchYearUpdatedEvent();
}

// Function to dispatch the custom "yearUpdated" event
function dispatchYearUpdatedEvent() {
  const [minYear, maxYear] = getCurrentYearRange();
  console.log(`Year range updated: ${minYear} - ${maxYear}`);

  const event = new Event("yearUpdated");
  window.dispatchEvent(event);
}