var place_selected = false;

function init() {
	addAddress();
	delAddress();
}

function addAddress() {
	$("#addAddress").on("click", function() {

		var inc = $(".row_address").length + 1,
				$newAddressRow = `
					<div id="${inc}" class="row_address">
						<div class="wrapper_address">
							<input type="text" name="address" placeholder="Address...">
						</div>
						<button class="remove">X</button>
					</div>
				`;

		$($newAddressRow).insertBefore($(this).parent());

		var $newAddressInput = $("input[name='address']:last");
		$newAddressInput.focus();
		place_selected = false;

		applySearchAddress($newAddressInput);

		$newAddressInput.on("blur", function() {
			if (!place_selected) {
				$newAddressInput.focus();
				return false;
			} else {
				place_selected = false;
			}
		});

	});
}

function delAddress() {
	$(document).on("click", ".remove", function() {
		$(this).closest(".row_address").remove();
		$("#predictions_" + $(this).closest("div").attr("id")).remove();
		$(".show_distance:first").remove();
		if ($("input[name='address']").length > 1) {
			calculateDistance();
		} else {
			$(".total_distance").html("");
		}
	});
}

function applySearchAddress($input) {
	if (google.maps.places.PlacesServiceStatus.OK != "OK") {
		console.info(google.maps.places.PlacesServiceStatus);
		return false;
	}

	var options = {
		componentRestrictions: {
			country: "br"
		}
	};

	var autocomplete = new google.maps.places.Autocomplete($input.get(0), options);

	autocomplete.addListener('place_changed', function() {

		place_selected = true;

		var place = autocomplete.getPlace();

		if (place.length == 0) {
			return;
		}

		var address = '',
				address_route = '',
				address_street_number = '',
				address_city = '',
				address_state = '',
				has_street_number = false;

		if (place.address_components) {

			place.address_components.forEach(function(item) {

				item.types.forEach(function(type) {
					if (type == "route") {
						address_route = item.long_name;
					}
					else if (type == "street_number") {
						has_street_number = true;
						address_street_number = ", "+item.long_name;
					}
					else if (type == "administrative_area_level_2") {
						address_city = item.long_name;
					}
					else if (type == "administrative_area_level_1") {
						address_state = item.short_name;
					}
				});
			});

			if (!has_street_number) {
				var street_number_label = "número";
				address = address_route + ", "+ street_number_label +" - "+ address_city +"/"+ address_state;

				$input.val(address);

				validateStreetNumber($input, street_number_label);

				$input.on("blur", function() {
					$input.removeClass("error");
					if ($(this).val().indexOf(street_number_label) != -1) {
						validateStreetNumber($input, street_number_label);
					}
				});

			} else {
				address = address_route + address_street_number +" - "+ address_city +"/"+ address_state;
				$input.val(address);
				calculateDistance();
			}
		}

		$input.blur();

	});

	// set attr id to the predictions list
	setTimeout(function() {
		var rowId = $input.closest("div").attr("id");
		$(".pac-container:last").attr("id", "predictions_" + rowId);
	}, 100);

}

function validateStreetNumber(input, street_number_label) {
	var $input = $(input),
			query = street_number_label,
			n = query.length,
			x = $(input).val().indexOf(query),
			y = x+n;
	$input.focus();
	$input.get(0).setSelectionRange(x, y);
}

function calculateDistance() {

	var distance_total = 0;
  $("input[name='address']").each(function(index) {
    if (index > 0) {
			var $this = $(this),
					origin = $("input[name='address']").eq(index-1).val(),
					destination = $this.val(),
					url_google_maps_view = 'https://www.google.com/maps/dir/'+ encodeURIComponent(origin) +'/'+ encodeURIComponent(destination) +'/data=!4m3!4m2!3e0!4e0?hl=pt-BR';

			getDistance(origin, destination)
			.then(function(response) {
				var km = Number(response), km_result = "<span class='km-label empty'>?</span>";
        if (km > 0) {
					km_result = km.toFixed(2) +"<span class='km-label'>Km</span>";
					distance_total += km;
				}
				$this.parent().find(".show_distance").remove();
				$("<a class='show_distance' href='"+ url_google_maps_view +"' target='_blank' title='View Google Mapas'>"+ km_result +"</a>").insertAfter($this);

				// open the console log
				console.log("origin: " + origin + " | destination: "+ destination +" | distance: "+ response +" km");

				// distance total
				console.log("distance_total: "+ distance_total.toFixed(2) +" km");
				$(".total_distance").html("<strong>Total: </strong>"+ distance_total.toFixed(2) +"<span class='km-label'> Km</span>");

			});
    }
	});

}

function getDistance(origin, destination) {

  return new Promise(function(resolve, reject) {

    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    }, getKM);

    function getKM(response, status) {
      if (status === 'OK') {

        var origin = response.originAddresses[0];
        var destination = response.destinationAddresses[0];
        var km = 0;

        if (response.rows[0].elements[0].status === "ZERO_RESULTS") {
          reject("Não foi possível calcular a rota entre " + origin + " e " + destination);
        } else {

          if (response.rows[0].elements[0].distance !== undefined) {
            var distance_value = response.rows[0].elements[0].distance.value;
            km = (distance_value/1000).toFixed(1);
          }
          resolve(km);
        }
      } else {
        reject(status);
      }
    }

  });

};

$(document).ready(function() {
	init();
})