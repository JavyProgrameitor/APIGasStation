const API_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";

document.addEventListener("DOMContentLoaded", () => {
  fetchProvince();
  document.getElementById("provincesDropdown").addEventListener("change", fetchMunicipality);
  document.getElementById("municipalityDropdown").addEventListener("change", makeFilter);
  document.getElementById("combustibleDropdown").addEventListener("change", makeFilter);
  document.getElementById("abiertasCheckbox").addEventListener("change", makeFilter); 
});
async function fetchProvince() {
  try {
    const response = await fetch(`${API_URL}Listados/Provincias/`);
    if (!response.ok) throw new Error("Error fetching provinces.");
    const provinces = await response.json();
    populateDropdown("provincesDropdown", provinces, "IDPovincia", "Provincia");
  } catch (error) {
    console.error(error);
  }
}
function populateDropdown(dropdownId, items, ID, label) {
  const dropdown = document.getElementById(dropdownId);
  dropdown.innerHTML = `<option>Select a ${label}</option>`;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item[ID];
    option.textContent = item[label];
    dropdown.appendChild(option);
  });
}
async function fetchMunicipality() {
  const provinceId = document.getElementById("provincesDropdown").value;

  try {
    const response = await fetch(`${API_URL}Listados/MunicipiosPorProvincia/${provinceId}`);
    if (!response.ok) throw new Error("Error fetching municipalities.");
    const municipalities = await response.json();
    populateDropdown("municipalityDropdown", municipalities, "IDMunicipio", "Municipio");
  } catch (error) {
    console.error(error);
  }
}
async function makeFilter() {
  const selectedMunicipality = document.getElementById("municipalityDropdown").value.trim();
  const selectedFuelType = document.getElementById("combustibleDropdown").value.trim();
  const alertContainer = document.getElementById("alertContainer");
  const openCheckbox = document.getElementById("abiertasCheckbox").checked;

  const resultsList = document.getElementById("resultList");
  resultsList.innerHTML = "";

  if (!selectedMunicipality || !selectedFuelType) {
    console.log("No valid filters selected.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}EstacionesTerrestres/FiltroMunicipio/${selectedMunicipality}`);
    if (!response.ok) throw new Error("Error fetching stations.");
    const data = await response.json();

    let stationsWithPrice = data.ListaEESSPrecio.filter(station => {
      const fuelPrice = station[`Precio ${selectedFuelType}`];
      return fuelPrice && fuelPrice !== "";
    });

    if (!data.ListaEESSPrecio || data.ListaEESSPrecio.length === 0) {
      alertContainer.innerHTML = `
        <div class="alert alert-warning p-4 mb-4 bg-yellow-100 border-l-4 border-yellow-500">
          No gas stations found in this location.
        </div>
      `;
      setTimeout(() => {
        alertContainer.innerHTML = "";
      }, 8000);
    } else if (stationsWithPrice.length === 0) {
      alertContainer.innerHTML = `
        <div class="alert alert-warning p-4 mb-4 bg-yellow-100 text-yellow-700 border-l-4 border-yellow-500">
          <strong>Warning!</strong> The fuel type ${selectedFuelType} is not available at this station.
        </div>
      `;
      setTimeout(() => {
        alertContainer.innerHTML = "";
      }, 8000);
    }
    // Filter for open stations if checkbox is checked
    if (openCheckbox) {
      stationsWithPrice = stationsWithPrice.filter(station => isStationInService(station.Horario));
    }
    // If checkbox is checked and no open stations found
    if (openCheckbox && stationsWithPrice.length === 0) {
      alertContainer.innerHTML = `
        <div class="alert alert-warning p-4 mb-4 bg-yellow-100 text-yellow-700 border-l-4 border-yellow-500">
          <strong>Warning!</strong> No stations are open at this time.
        </div>
      `;
      setTimeout(() => {
        alertContainer.innerHTML = "";
      }, 8000);
    }
    // Display the stations
    stationsWithPrice.forEach((station) => {
      const fuelPrice = station[`Precio ${selectedFuelType}`];

      const li = document.createElement("li");
      li.className = "mb-2 p-2 border rounded bg-gray-200";
      li.innerHTML = `
  <p class="text-blue-600 font-black">Address: <span class="font-normal">${station.Dirección}</span></p>
  <p class="text-blue-600 font-black"><City: <span class="font-normal">${station.Localidad}</span></p>
  <p class="text-blue-600 font-black">Province: <span class="font-normal">${station.Provincia}</span></p>
  <p class="text-blue-600 font-black">Schedule: <span class="font-normal">${station.Horario}</span></p>
  <p class="text-blue-600 font-black">Price of ${selectedFuelType}: <span class="font-normal">${fuelPrice}</span></p>
      `;
      resultsList.appendChild(li);
    });

  } catch (error) {
    console.error(error);
  }
}
// Check if the station is open now
function isStationInService(schedule) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (schedule.includes("L-D: 24H")) return true;

  const daysMap = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
  const hours = schedule.split(";");

  for (const hour of hours) {
    const [days, timeRange] = hour.split(": ");
    const [startDay, endDay] = days.split("-").map((d) => daysMap[d.trim()]);
    const [start, end] = timeRange
      .split("-")
      .map((t) => t.split(":").reduce((h, m) => h * 60 + Number(m)));

    if (
      ((currentDay >= startDay && currentDay <= endDay) ||
        (endDay < startDay &&
          (currentDay >= startDay || currentDay <= endDay))) &&
      ((currentTime >= start && currentTime <= end) ||
        (end < start && (currentTime >= start || currentTime <= end)))
    ) {
      return true;
    }
  }
  return false;
}
