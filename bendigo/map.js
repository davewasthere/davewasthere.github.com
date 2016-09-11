function initMap(){
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: centerLat,
      lng: centerLng
    },
    draggable: false,
    scrollwheel: true,
    panControl: false,
    maxZoom: 18,
    minZoom: 17,
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

  //google.maps.event.addListener(map, 'dragend', function () {
  //  var currentLocation = document.getElementById('current-location')
  //  currentLocation.style.backgroundPosition = '0px 0px'
  //  locationMarker.setOptions({
  //    'opacity': 0.5
  //  })
  //})
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
    centerMapOnLocation()
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
    // currentLocation.style.backgroundPosition = imgX + 'px 0'
  }, 500)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)
      locationMarker.setVisible(true)
      locationMarker.setOptions({
        'opacity': 1
      })
      locationMarker.setPosition(latlng)
      map.setCenter(latlng)
      clearInterval(animationInterval)
      currentLocation.style.backgroundPosition = '-144px 0px'

      if (locationMarker.rangeCirle)
      { }
      else
      {
        locationMarker.rangeCirle = addRangeCircle(locationMarker, map, 'nearby');
      }

    })
  } else {
    clearInterval(animationInterval)
    currentLocation.style.backgroundPosition = '0px 0px'
  }
}


function getPointDistance(pointA, pointB) {
  return google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB)
}


$(function () {

  window.setInterval(centerMapOnLocation, 2000);

});

