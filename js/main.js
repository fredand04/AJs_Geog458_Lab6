mapboxgl.accessToken =
    'pk.eyJ1IjoiYXdlc29tZWd1eWUiLCJhIjoiY21sdWhuOHB4MGF4eDNrcHVlOWI0Y3BuNCJ9.jCE-PXq9Zqe_poRIRaJf8A';

let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    zoom: 10.6,
    minZoom: 10,
    center: [-122.45, 47.615]
});

let educationChart = null;
let educationData = null;

const grades = [20, 40, 60, 80];
const colors = ['#f2f0f7','#cbc9e2','#9e9ac8','#6a51a3'];

const legend = document.getElementById('legend');
let labels = ['<strong>% Bachelor’s Degree or Higher</strong>'];

for (let i = 0; i < grades.length; i++) {
    let from = grades[i];
    let to = grades[i + 1];
    labels.push(
        `<p><i style="background:${colors[i]}; width:18px; height:18px; display:inline-block;"></i>
        ${from}${to ? '&ndash;' + to : '+'}%</p>`
    );
}
legend.innerHTML = labels.join('');

async function geojsonFetch() {

    let response = await fetch('assets/neighborhood_map_layers.geojson');
    educationData = await response.json();

    map.on('load', () => {

        map.addSource('neighborhoods', {
            type: 'geojson',
            data: educationData
        });

        map.addLayer({
            id: 'education-layer',
            type: 'fill',
            source: 'neighborhoods',
            paint: {
                'fill-color': [
                    'step',
                    ['get', 'BACHELOR_HIGHER_PERCENT'],
                    colors[0],
                    grades[1], colors[1],
                    grades[2], colors[2],
                    grades[3], colors[3]
                ],
                'fill-opacity': 0.75,
                'fill-outline-color': '#ffffff'
            }
        });

        map.on('click', 'education-layer', (event) => {
            const props = event.features[0].properties;
            new mapboxgl.Popup()
                .setLngLat(event.lngLat)
                .setHTML(
                    `<strong>${props.NEIGH_NAME}</strong><br>
                    % Bachelor’s Degree or Higher: ${props.BACHELOR_HIGHER_PERCENT}%`
                )
                .addTo(map);
        });

        updateDashboard();
    });

    map.on('idle', updateDashboard);
}

geojsonFetch();

function updateDashboard() {

    let bounds = map.getBounds();
    let count = 0;

    let categories = {
        "0-40%": 0,
        "40-60%": 0,
        "60-80%": 0,
        "80%+": 0
    };

    educationData.features.forEach(feature => {

        let center = turf.center(feature).geometry.coordinates;

        if (bounds.contains(center)) {

            count++;
            let value = feature.properties.BACHELOR_HIGHER_PERCENT;

            if (value < 40) categories["0-40%"]++;
            else if (value < 60) categories["40-60%"]++;
            else if (value < 80) categories["60-80%"]++;
            else categories["80%+"]++;
        }
    });

    document.getElementById("neighborhood-count").innerHTML = count;

    let x = ["x"].concat(Object.keys(categories));
    let y = ["Neighborhoods"].concat(Object.values(categories));

    if (!educationChart) {
        educationChart = c3.generate({
            size: { height: 300, width: 400 },
            data: { x: 'x', columns: [x, y], type: 'bar' },
            axis: {
                x: { type: 'category' },
                y: {
                    label: {
                        text: 'Number of Neighborhoods',
                        position: 'outer-middle'
                    }
                }
            },
            bindto: "#education-chart"
        });
    } else {
        educationChart.load({ columns: [x, y] });
    }
}

document.getElementById('reset').addEventListener('click', () => {
    map.flyTo({
        zoom: 10.6,
        center: [-122.45, 47.615]
    });
    map.setFilter('education-layer', null);
});
