var rawDataIsLoading = false;
var locationMarker;
var mapData = {
  pokemons: {},
  gyms: {},
  pokestops: {},
  lurePokemons: {},
  scanned: {},
  spawnpoints: {}
}
var pokeData = null;





function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: centerLat,
      lng: centerLng
    },
    draggable: false,
    scrollwheel: true,
    panControl: false,
    maxZoom: 18,
    minZoom: 16,
    zoom: 17,
    zoomControl: true,
    scaleControl: true,
    fullscreenControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    clickableIcons: false,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      position: google.maps.ControlPosition.RIGHT_TOP,
      mapTypeIds: [
        google.maps.MapTypeId.ROADMAP,
        google.maps.MapTypeId.SATELLITE,
        'nolabels_style',
        'dark_style',
        'style_light2',
        'style_pgo',
        'dark_style_nl',
        'style_light2_nl',
        'style_pgo_nl'
      ]
    }
  });

  addMyLocationButton();

}



function addRangeCircle(marker, map, type, teamId) {
  var targetmap = null
  var circleCenter = new google.maps.LatLng(marker.position.lat(), marker.position.lng())
  var gymColors = ['#999999', '#0051CF', '#FF260E', '#FECC23'] // 'Uncontested', 'Mystic', 'Valor', 'Instinct']
  var teamColor = gymColors[0]
  if (teamId) teamColor = gymColors[teamId]

  var range
  var circleColor

  // handle each type of marker and be explicit about the range circle attributes
  switch (type) {
    case 'pokemon':
      circleColor = '#C233F2'
      range = 40 // pokemon appear at 40m and then you can move away. still have to be 40m close to see it though, so ignore the further disappear distance
      break
    case 'pokestop':
      circleColor = '#3EB0FF'
      range = 40
      break
    case 'gym':
      circleColor = teamColor
      range = 40
      break
    case 'nearby':
      circleColor = '#FECC23'
      range = 201
      break
    case 'visible':
      circleColor = '#FECC23'
      range = 70
      break
  }

  if (map) targetmap = map

  var rangeCircleOpts = {
    map: targetmap,
    radius: range, // meters
    strokeWeight: 1,
    strokeColor: circleColor,
    strokeOpacity: 0.9,
    center: circleCenter,
    fillColor: circleColor,
    fillOpacity: 0.3
  }
  var rangeCircle = new google.maps.Circle(rangeCircleOpts)
  return rangeCircle
}



function addMyLocationButton() {
  locationMarker = new google.maps.Marker({
    map: map,
    animation: google.maps.Animation.DROP,
    position: {
      lat: centerLat,
      lng: centerLng
    },
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
  locationMarker.setVisible(false)
  
  myLocationButton(map, locationMarker)

}

function myLocationButton(map, marker) {
  var locationContainer = document.createElement('div')

  var locationButton = document.createElement('button')
  locationButton.style.backgroundColor = '#fff'
  locationButton.style.border = 'none'
  locationButton.style.outline = 'none'
  locationButton.style.width = '28px'
  locationButton.style.height = '28px'
  locationButton.style.borderRadius = '2px'
  locationButton.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)'
  locationButton.style.cursor = 'pointer'
  locationButton.style.marginRight = '10px'
  locationButton.style.padding = '0px'
  locationButton.title = 'Your Location'
  locationContainer.appendChild(locationButton)

  var locationIcon = document.createElement('div')
  locationIcon.style.margin = '5px'
  locationIcon.style.width = '18px'
  locationIcon.style.height = '18px'
  locationIcon.style.backgroundImage = 'url(mylocation-sprite-1x.png)'
  locationIcon.style.backgroundSize = '180px 18px'
  locationIcon.style.backgroundPosition = '0px 0px'
  locationIcon.style.backgroundRepeat = 'no-repeat'
  locationIcon.id = 'current-location'
  locationButton.appendChild(locationIcon)

  locationButton.addEventListener('click', function () {
    centerMapOnLocation();
  })

  locationContainer.index = 1
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationContainer)
}


function centerMapOnLocation() {
  var currentLocation = document.getElementById('current-location')
  var imgX = '0'
  var animationInterval = setInterval(function () {
    if (imgX === '-18') {
      imgX = '0'
    } else {
      imgX = '-18'
    }
    currentLocation.style.backgroundPosition = imgX + 'px 0'
  }, 500)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)
      locationMarker.setVisible(true)
      locationMarker.setOptions({
        'opacity': 1
      })
      locationMarker.setPosition(latlng);
      map.setCenter(latlng);
      clearInterval(animationInterval);

      $('#current-location').css('background-position', '-144px 0px');

      if (locationMarker.rangeCircle)
      {
        locationMarker.rangeCircle.setCenter(latlng);
      }
      else
      {
        locationMarker.rangeCircle = addRangeCircle(locationMarker, map, 'nearby');
      }

    })
  } else {
    clearInterval(animationInterval);
    currentLocation.style.backgroundPosition = '0px 0px';
  }
}


function getPointDistance(pointA, pointB) {
  return google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB)
}


function updateMap() {

  if (pokeData == null)
  {
    loadRawData();
  }
  

  var bounds = map.getBounds();
  var swPoint = bounds.getSouthWest()
  var nePoint = bounds.getNorthEast()
  var swLat = swPoint.lat()
  var swLng = swPoint.lng()
  var neLat = nePoint.lat()
  var neLng = nePoint.lng()

  $.each(mapData.spawnpoints, processSpawnpoints);
  // showInBoundsMarkers(mapData.spawnpoints, 'inbound');
  // clearStaleMarkers();
}

function loadRawData() {
  return $.ajax({
    url: 'poke.json',
    type: 'GET',
    dataType: 'json',
    cache: false,
    beforeSend: function () {
      if (rawDataIsLoading) {
        return false
      } else {
        rawDataIsLoading = true
      }
    },
    complete: function () {
      rawDataIsLoading = false
    },
    success: function (data) {
      pokeData = data;

      $.each(data.spawnpoints, processSpawnpoints);

    }
  })
}


function showInBoundsMarkers(markers, type) {
  $.each(markers, function (key, value) {
    var marker = markers[key].marker
 
    
    
//  var show = false
  //  if (!markers[key].hidden) {
  //    if (typeof marker.getBounds === 'function') {
  //      if (map.getBounds().intersects(marker.getBounds())) {
  //        show = true
  //      }
  //    } else if (typeof marker.getPosition === 'function') {
  //      if (map.getBounds().contains(marker.getPosition())) {
  //        show = true
  //      }
  //    }
  //  }

  //  if (show && !marker.getMap()) {
  //    marker.setMap(map)
  //    // Not all markers can be animated (ex: scan locations)
  //    if (marker.setAnimation && marker.oldAnimation) {
  //      marker.setAnimation(marker.oldAnimation)
  //    }
  //  } else if (!show && marker.getMap()) {
  //    // Not all markers can be animated (ex: scan locations)
  //    if (marker.getAnimation) {
  //      marker.oldAnimation = marker.getAnimation()
  //    }
  //    if (marker.rangeCircle) marker.rangeCircle.setMap(null)
  //     marker.setMap(map)
  //  }

  })
}


function clearStaleMarkers() {
  $.each(mapData.pokemons, function (key, value) {
    if (mapData.pokemons[key]['disappear_time'] < new Date().getTime() ||
      excludedPokemon.indexOf(mapData.pokemons[key]['pokemon_id']) >= 0) {
      if (mapData.pokemons[key].marker.rangeCircle) {
        mapData.pokemons[key].marker.rangeCircle.setMap(null)
        delete mapData.pokemons[key].marker.rangeCircle
      }
      mapData.pokemons[key].marker.setMap(null)
      delete mapData.pokemons[key]
    }
  })
}


function processSpawnpoints(i, item) {
  var id = item['spawnpoint_id']

  var circleCenter = new google.maps.LatLng(item['latitude'], item['longitude'])
  var distance = getPointDistance(circleCenter, centerMap);
  
  if (id in mapData.spawnpoints) {
    var color = getColorBySpawnTime(item['time']);

    mapData.spawnpoints[id].marker.setOptions({
      fillColor: color
    });

    if(color == 'hsl(275,100%,50%)' || distance > 250)
    {
      mapData.spawnpoints[id].marker.setMap(null);
    }
    else
    {
      mapData.spawnpoints[id].marker.setMap(map);
    }

  } else { // add marker to map and item to dict
    if (item.marker) {
      item.marker.setMap(null)
    }
    item.marker = setupSpawnpointMarker(item)
    mapData.spawnpoints[id] = item
  }
}




function setupSpawnpointMarker(item) {
  var circleCenter = new google.maps.LatLng(item['latitude'], item['longitude'])
  var distance = getPointDistance(circleCenter, centerMap);
  var color = getColorBySpawnTime(item.time);

  var marker = new google.maps.Circle({
    map: distance < 250 && color != 'hsl(275,100%,50%)' ? map : null,
    center: circleCenter,
    radius: 5, // metres
    fillColor: color,
    strokeWeight: 1
  })

  //marker.infoWindow = new google.maps.InfoWindow({
  //  content: spawnpointLabel(item),
  //  disableAutoPan: true,
  //  position: circleCenter
  //})

  //addListeners(marker)

  return marker
}



function clearSelection () {
  if (document.selection) {
    document.selection.empty()
  } else if (window.getSelection) {
    window.getSelection().removeAllRanges()
  }
}

function addListeners (marker) {
  marker.addListener('click', function () {
    marker.infoWindow.open(map, marker)
    clearSelection()
    updateLabelDiffTime()
    marker.persist = true
  })

  google.maps.event.addListener(marker.infoWindow, 'closeclick', function () {
    marker.persist = null
  })

  marker.addListener('mouseover', function () {
    marker.infoWindow.open(map, marker)
    clearSelection()
    //updateLabelDiffTime()
  })

  marker.addListener('mouseout', function () {
    if (!marker.persist) {
      marker.infoWindow.close()
    }
  })

  return marker
}


function formatSpawnTime (seconds) {
  // the addition and modulo are required here because the db stores when a spawn disappears
  // the subtraction to get the appearance time will knock seconds under 0 if the spawn happens in the previous hour
  return ('0' + Math.floor(((seconds + 3600) % 3600) / 60)).substr(-2) + ':' + ('0' + seconds % 60).substr(-2)
}


function spawnpointLabel (item) {
  var str = `
    <div>
      <b>Spawn Point</b>
    </div>
    <div>
      Every hour from ${formatSpawnTime(item.time)} to ${formatSpawnTime(item.time + 900)}
  </div>`

  if (item.special) {
    str += `
      <div>
        May appear as early as ${formatSpawnTime(item.time - 1800)}
    </div>`
  }
  return str
}




function getColorBySpawnTime(value) {
  var now = new Date()
  var seconds = now.getMinutes() * 60 + now.getSeconds()

  // account for hour roll-over
  if (seconds < 900 && value > 2700) {
    seconds += 3600
  } else if (seconds > 2700 && value < 900) {
    value += 3600
  }

  var diff = (seconds - value)
  var hue = 275 // purple when spawn is neither about to spawn nor active

  if (diff >= 0 && diff <= 900) { // green to red over 15 minutes of active spawn
    hue = (1 - (diff / 60 / 15)) * 120
  } else if (diff < 0 && diff > -300) { // light blue to dark blue over 5 minutes til spawn
    hue = ((1 - (-diff / 60 / 5)) * 50) + 200
  }

  return ['hsl(', hue, ',100%,50%)'].join('')
}



$(function () {

  centerMapOnLocation();


  //window.setInterval(centerMapOnLocation, 5000);

//  window.setInterval(updateLabelDiffTime, 1000)
  window.setInterval(updateMap, 5000)

  window.setInterval(function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        centerLat = position.coords.latitude;
        centerLong = position.coords.longitude;
        centerMap = new google.maps.LatLng(centerLat, centerLong);

        $('#current-location').css('background-position', '-144px 0px');

        if (getPointDistance(locationMarker.getPosition(), (new google.maps.LatLng(centerLat, centerLong))) > 40) {
          var center = new google.maps.LatLng(centerLat, centerLong)
          map.panTo(center)
          if(locationMarker && locationMarker.rangeCircle)
          {
            locationMarker.setCenter(center);
            locationMarker.rangeCircle.setCenter(center);
          }
        }
      })
    }
  }, 1000)

});

