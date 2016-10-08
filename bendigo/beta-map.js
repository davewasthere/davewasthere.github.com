var map;
var marker;
var nearby;
var pokedata = {};
var updateInterval;
var trackInterval;
var autoTrackEnabled = false;
var isBusy = false;
var mapData = {
  spawnpoints: {}
};
var rawData = {
  spawnpoints: {}
}

var noLabelsStyle = [{
  featureType: 'poi',
  elementType: 'labels',
  stylers: [{
    visibility: 'off'
  }]
}, {
  'featureType': 'all',
  'elementType': 'labels.text.stroke',
  'stylers': [{
    'visibility': 'off'
  }]
}, {
  'featureType': 'all',
  'elementType': 'labels.text.fill',
  'stylers': [{
    'visibility': 'off'
  }]
}, {
  'featureType': 'all',
  'elementType': 'labels.icon',
  'stylers': [{
    'visibility': 'off'
  }]
}];


// https://developers.google.com/maps/documentation/javascript/tutorial

function initMap() {

  var parsedHash = parseHash(window.location.hash);
  var startPosition = new google.maps.LatLng(parsedHash[0], parsedHash[1]);

  updateInterval = setInterval(updateTime, 1000);
  trackInterval = setInterval(autoTrack, 5000);

  map = new google.maps.Map(document.getElementById('map'), {
    center: startPosition,
    styles: noLabelsStyle,
    draggable: true,
    scrollwheel: true,
    panControl: false,
    zoom: 17,
    zoomControl: true,
    scaleControl: true,
    fullscreenControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    clickableIcons: false
  })

  map.addListener('click', function (e) {
    marker.setPosition(e.latLng);
    nearby.setCenter(e.latLng);
    scan.setCenter(e.latLng);
    window.location.hash = (e.latLng.lat() + "," + e.latLng.lng());
    findVisibleSpawnpoints();
  });

  map.addListener("movestart", function (event) {
    isBusy = true;
  });
  map.addListener("zoomstart", function (event) {
    isBusy = true;
  });
  map.addListener("dragstart", function (event) {
    isBusy = true;
  });
  map.addListener("dragend", function (event) {
    isBusy = false;
  });
  map.addListener("moveend", function (event) {
    isBusy = false;
  });
  map.addListener("zoomend", function (event) {
    isBusy = false;
  });


  marker = new google.maps.Marker({
    position: startPosition,
    map: map
  });

  nearby = new google.maps.Circle({
    strokeColor: '#FECC23',
    strokeOpacity: 0.4,
    strokeWeight: 3,
    fillColor: '#FECC23',
    fillOpacity: 0.2,
    map: map,
    center: startPosition,
    radius: 200,
    clickable: false
  });

  scan = new google.maps.Circle({
    strokeColor: '#FECC23',
    strokeOpacity: 0.4,
    strokeWeight: 2,
    fillColor: '#FECC23',
    fillOpacity: 0.2,
    map: map,
    center: startPosition,
    radius: 40,
    clickable: false
  });

  myLocationButton();

  loadRawData();
}


function parseHash(hash) {
  var defaultLat = "-36.7570";
  var defaultLng = "144.2794";
  var match = /^#(\-?\d+(\.\d+)?),\s*(\-?\d+(\.\d+)?)$/.exec(hash);
  if (!match) {
    return [defaultLat, defaultLng];
  }
  return [match[1], match[3]];
}

function loadRawData() {
  return $.ajax({
    url: 'poke.json',
    type: 'GET',
    dataType: 'json',
    cache: false,
    success: function (data) {
      rawData = data;
      findVisibleSpawnpoints();
    }
  })
}

function findVisibleSpawnpoints()
{

  $.each(mapData.spawnpoints, function (i, item) {

    var circleCenter = new google.maps.LatLng(item['latitude'], item['longitude']);
    var distance = getPointDistance(circleCenter, marker.position);
    if (distance > 500) {
      if (item.marker) {
        item.marker.setMap(null);
      }
    }


  });

  mapData.spawnpoints = {};

  $.each(rawData.spawnpoints, function (i, item) {
    var id = item.spawnpoint_id;
    var circleCenter = new google.maps.LatLng(item['latitude'], item['longitude']);
    var distance = getPointDistance(circleCenter, marker.position);

    if (distance > 500) {
      // ignore
    }
    else {

      if (item.marker)
      {
        // ignore
      }
      else
      {
        if (id in mapData.spawnpoints) {
          if (mapData.spawnpoints[id].time != item["time"]) {
            mapData.spawnpoints[id].alttime = item["time"];

            mapData.spawnpoints[id].marker.infoWindow.setContent(spawnpointLabel(mapData.spawnpoints[id]));
          }
        }
        else {
          mapData.spawnpoints[id] = item;
          item.marker = setupSpawnpointMarker(item);
        }
      }
    }

  });
}

function processSpawnpoints(i, item) {

  if (!isBusy) {

    var id = item['spawnpoint_id'];

    var circleCenter = new google.maps.LatLng(item['latitude'], item['longitude']);
    var distance = getPointDistance(circleCenter, marker.position);

    if (id in mapData.spawnpoints) {

      if (mapData.spawnpoints[id].time != item["time"]) {
        mapData.spawnpoints[id].alttime = item["time"];
        //mapData.spawnpoints[id].marker.infoWindow.setContent(spawnpointLabel(mapData.spawnpoints[id]));
      }

      var color = getColorBySpawnTime(item['time']);
      var radius = getRadiusBySpawnTime(item['time']);
      borderOpacity = 1;
      strokeWeight = 1;

      if (radius > 2 && radius < 17) {
        if (radius > 15) {
          borderOpacity = 0.3;
        }
      }
      else {
        color = 'hsla(0,0%,0%,0.4)';
        radius = 0;
        borderOpacity = 0.1;

        if (item.alttime) {
          var color = getColorBySpawnTime(item['alttime']);
          var radius = getRadiusBySpawnTime(item['alttime']);

          if (radius > 2 && radius < 17) {
            if (radius > 15) {
              borderOpacity = 0.3;
            }
          }
          else {
            color = 'hsla(0,0%,0%,0.4)';
            radius = 0;
            borderOpacity = 0.1;
          }
        }
      }


      // console.debug(minutes);

      mapData.spawnpoints[id].marker.setOptions({
        fillColor: color,
        radius: radius + 2,
        strokeOpacity: borderOpacity
      });



      if (distance > 500) {
        mapData.spawnpoints[id].marker.setMap(null);
      }
      else {
        mapData.spawnpoints[id].marker.setMap(map);
      }

      mapData.spawnpoints[id].marker.fillColor = getColorBySpawnTime(item["time"]);

    } else { // add marker to map and item to dict
      item.marker = setupSpawnpointMarker(item);
      mapData.spawnpoints[id] = item;
    }
  }
}

function setupSpawnpointMarker(item)
{

  var circleCenter = new google.maps.LatLng(item['latitude'], item['longitude']);
  var distance = getPointDistance(circleCenter, marker.position);
  var color = 'hsla(0,0%,0%,0.4)';
  var show = false;
  var borderOpacity = 0.1;

  var m = new google.maps.Circle({
    map: distance > 500 ? null : map,
    center: circleCenter,
    radius: 0, // metres
    fillColor: color,
    fillOpacity: 0.3,
    strokeWeight: 1,
    strokeOpacity: borderOpacity,
    label: item["spawnpoint_id"]
  });

  m.infoWindow = new google.maps.InfoWindow({
    content: spawnpointLabel(item),
    disableAutoPan: true,
    position: circleCenter
  });

  addListeners(m);

  return m
}

function getPointDistance(pointA, pointB) {
  return google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB)
}

function spawnpointLabel (item) {
  var str = '<div><b>Spawn Point: </b>' + item['spawnpoint_id'] + '</div>' +
    '<div>' + formatSpawnTime(item.time) + '<div>';

  if (item.alttime)
  {
    str += '<div>also ' + formatSpawnTime(item.alttime) + '<div>';

  }

  return str
}

function addListeners(marker) {
  marker.addListener('click', function () {
    marker.infoWindow.open(map, marker);
    clearSelection()
    //updateLabelDiffTime()
    marker.persist = true;
  })

  google.maps.event.addListener(marker.infoWindow, 'closeclick', function () {
    marker.persist = null;
  })

  marker.addListener('mouseover', function () {
    marker.infoWindow.open(map, marker);
    clearSelection();
    //updateLabelDiffTime()
  })

  marker.addListener('mouseout', function () {
    if (!marker.persist) {
      marker.infoWindow.close();
    }
  })

  return marker
}


function clearSelection() {
  if (document.selection) {
    document.selection.empty();
  } else if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
}


function updateTime()
{
  if (!isBusy)
  {
    $.each(mapData.spawnpoints, processSpawnpoints);
  }
}

function autoTrack()
{
  $('#current-location').css('background-position', '0px 0px');

  if (autoTrackEnabled) {

    $('#current-location').css('background-position', '-144px 0px');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)

        map.panTo(latlng);


        //$('#current-location').css('background-position', '-144px 0px');


        marker.setPosition(latlng);
        nearby.setCenter(latlng);
        scan.setCenter(latlng);
        window.location.hash = (latlng.lat() + "," + latlng.lng());

        findVisibleSpawnpoints();

      })
    } else {

      $('#current-location').css('background-position', '0px 0px');

    }
  }
}


function getColorBySpawnTime(value) {
  var now = new Date()
  var seconds = now.getMinutes() * 60 + now.getSeconds()
  var alpha = 1;

  // account for hour roll-over
  if (seconds < 900 && value > 2700) {
    seconds += 3600
  } else if (seconds > 2700 && value < 900) {
    value += 3600
  }

  var diff = (seconds - value)
  var hue = 275 // purple when spawn is neither about to spawn nor active
  alpha = 0.2;

  if (diff >= 0 && diff <= 900) { // green to red over 15 minutes of active spawn
    hue = (1 - (diff / 60 / 15)) * 120
    alpha = 1;
  } else if (diff < 0 && diff > -300) { // light blue to dark blue over 5 minutes til spawn
    hue = ((1 - (-diff / 60 / 5)) * 50) + 200
    alpha = 0.2;
  }

  return ['hsla(', hue, ',100%,50%,', alpha, ')'].join('')
}


function getRadiusBySpawnTime(value) {
  var now = new Date();
  var seconds = now.getMinutes() * 60 + now.getSeconds();

  // account for hour roll-over
  if (seconds < 900 && value > 2700) {
    seconds += 3600;
  } else if (seconds > 2700 && value < 900) {
    value += 3600;
  }

  var minutesRemaining = 15 - (seconds - value) / 60;

  return minutesRemaining;
}

function formatSpawnTime(seconds) {
  // the addition and modulo are required here because the db stores when a spawn disappears
  // the subtraction to get the appearance time will knock seconds under 0 if the spawn happens in the previous hour
  return ('0' + Math.floor(((seconds + 3600) % 3600) / 60)).substr(-2) + ':' + ('0' + seconds % 60).substr(-2)
}



function myLocationButton() {
  var locationContainer = document.createElement('div');

  var locationButton = document.createElement('button');
  locationButton.style.backgroundColor = '#fff';
  locationButton.style.border = 'none';
  locationButton.style.outline = 'none';
  locationButton.style.width = '28px';
  locationButton.style.height = '28px';
  locationButton.style.borderRadius = '2px';
  locationButton.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
  locationButton.style.cursor = 'pointer';
  locationButton.style.marginRight = '10px';
  locationButton.style.padding = '0px';
  locationButton.title = 'Your Location';
  locationContainer.appendChild(locationButton);

  var locationIcon = document.createElement('div');
  locationIcon.style.margin = '5px';
  locationIcon.style.width = '18px';
  locationIcon.style.height = '18px';
  locationIcon.style.backgroundImage = 'url(mylocation-sprite-1x.png)';
  locationIcon.style.backgroundSize = '180px 18px';
  locationIcon.style.backgroundPosition = '0px 0px';
  locationIcon.style.backgroundRepeat = 'no-repeat';
  locationIcon.id = 'current-location';
  locationButton.appendChild(locationIcon);

  locationButton.addEventListener('click', function () {
    autoTrackEnabled = !autoTrackEnabled;
    autoTrack();

    var parsedHash = parseHash(window.location.hash);
    var startPosition = new google.maps.LatLng(parsedHash[0], parsedHash[1]);

    marker.setMap(null);

    if (autoTrackEnabled)
    {
      marker = new google.maps.Marker({
        map: map,
        position: startPosition,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillOpacity: 1,
          fillColor: '#1c8af6',
          scale: 6,
          strokeColor: '#1c8af6',
          strokeWeight: 8,
          strokeOpacity: 0.3
        }
      })
    }
    else
    {
      marker = new google.maps.Marker({
        position: startPosition,
        map: map
      });
    }

  })

  locationContainer.index = 1;
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationContainer);
}