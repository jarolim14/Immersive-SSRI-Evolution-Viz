// yearSlider.js
export function initializeYearSlider(container, onYearChange) {
  const sliderHTML = `
    <div class="range_container">
      <div class="sliders_control">
        <input id="fromSlider" type="range" value="1990" min="1900" max="2023" />
        <input id="toSlider" type="range" value="2023" min="1900" max="2023" />
      </div>
      <div class="form_control">
        <div class="form_control_container">
          <div class="form_control_container__time">Min</div>
          <input class="form_control_container__time__input" type="number" id="fromInput" value="1990" min="1900" max="2023" />
        </div>
        <div class="form_control_container">
          <div class="form_control_container__time">Max</div>
          <input class="form_control_container__time__input" type="number" id="toInput" value="2023" min="1900" max="2023" />
        </div>
      </div>
    </div>
  `;

  container.innerHTML = sliderHTML;

  const fromSlider = document.getElementById("fromSlider");
  const toSlider = document.getElementById("toSlider");
  const fromInput = document.getElementById("fromInput");
  const toInput = document.getElementById("toInput");

  function controlFromSlider(fromSlider, toSlider, fromInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
    if (from > to) {
      fromSlider.value = to;
      fromInput.value = to;
    } else {
      fromInput.value = from;
    }
    onYearChange(parseInt(fromInput.value), parseInt(toInput.value));
  }

  function controlToSlider(fromSlider, toSlider, toInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
    setToggleAccessible(toSlider);
    if (from <= to) {
      toSlider.value = to;
      toInput.value = to;
    } else {
      toInput.value = from;
      toSlider.value = from;
    }
    onYearChange(parseInt(fromInput.value), parseInt(toInput.value));
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

  fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
  toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
  fromInput.oninput = () =>
    controlFromInput(fromSlider, fromInput, toInput, toSlider);
  toInput.oninput = () =>
    controlToInput(toSlider, fromInput, toInput, toSlider);

  function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
    const [from, to] = getParsed(fromInput, toInput);
    fillSlider(fromInput, toInput, "#C6C6C6", "#25daa5", controlSlider);
    if (from > to) {
      fromSlider.value = to;
      fromInput.value = to;
    } else {
      fromSlider.value = from;
    }
    onYearChange(parseInt(fromInput.value), parseInt(toInput.value));
  }

  function controlToInput(toSlider, fromInput, toInput, controlSlider) {
    const [from, to] = getParsed(fromInput, toInput);
    fillSlider(fromInput, toInput, "#C6C6C6", "#25daa5", controlSlider);
    setToggleAccessible(toInput);
    if (from <= to) {
      toSlider.value = to;
      toInput.value = to;
    } else {
      toInput.value = from;
    }
    onYearChange(parseInt(fromInput.value), parseInt(toInput.value));
  }
}

export function getCurrentYearRange() {}
