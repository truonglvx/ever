import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import 'style-loader!leaflet/dist/leaflet.css';
import { ActivatedRoute } from '@angular/router';
import { CarrierRouter } from '@modules/client.common.angular2/routers/carrier-router.service';
import { first } from 'rxjs/operators';
import { CarrierOrdersRouter } from '@modules/client.common.angular2/routers/carrier-orders-router.service';
import { ICarrierOrdersRouterGetOptions } from '@modules/server.common/routers/ICarrierOrdersRouter';
import { environment } from 'environments/environment';
import { CarriersService } from 'app/@core/data/carriers.service';
import GeoLocation from '@modules/server.common/entities/GeoLocation';

declare var google: any;
const directionsDisplay = new google.maps.DirectionsRenderer();
const directionsService = new google.maps.DirectionsService();

@Component({
	selector: 'ea-carrier-location',
	styleUrls: ['./carrier-location.component.scss'],
	template: `
		<nb-card [ngClass]="{ 'modal-style': carrierId }">
			<nb-card-header class="header-color">{{
				'CARRIERS_VIEW.CARRIER_PAGE.LOCATION' | translate
			}}</nb-card-header>
			<nb-card-body> <div #gmap class="googleMap"></div> </nb-card-body>
		</nb-card>
	`
})
export class CarrierLocationComponent implements OnDestroy, OnInit {
	private ngDestroy$ = new Subject();

	@ViewChild('gmap')
	gmapElement: any;
	map: google.maps.Map;
	carrierSub$: any;
	marker: any;
	userMarker: any;
	warehouseMarker: any;
	interval: NodeJS.Timer;
	isReverted: boolean = true;
	params$: any;
	carrierId: string;

	constructor(
		private route: ActivatedRoute,
		private carrierRouter: CarrierRouter,
		private carrierOrdersRouter: CarrierOrdersRouter,
		private carriersService: CarriersService
	) {}

	ngOnInit(): void {
		this.showMap();
		this._subscribeCarrier();
	}

	async _subscribeCarrier() {
		this.params$ = this.route.params.subscribe((res) => {
			const carrierId = res.id || this.carrierId;

			this.carrierSub$ = this.carrierRouter
				.get(carrierId)
				.subscribe(async (carrier) => {
					if (this.interval) {
						clearInterval(this.interval);
					}
					const newCoordinates = new google.maps.LatLng(
						carrier.geoLocation.coordinates.lat,
						carrier.geoLocation.coordinates.lng
					);
					if (this.marker) {
						this.marker.setMap(null);
					}
					let isWorking = false;

					this.interval = setInterval(async () => {
						const order = await this.carriersService.getCarrierCurrentOrder(
							carrierId
						);

						if (order) {
							if (!isWorking) {
								const user = order.user;
								const warehouse = order.warehouse;
								const warehouseIcon =
									environment.MAP_MERCHANT_ICON_LINK;
								const userIcon = environment.MAP_USER_ICON_LINK;
								user.geoLocation = new GeoLocation(
									user.geoLocation
								);
								this.userMarker = this.addMarker(
									new google.maps.LatLng(
										user.geoLocation.coordinates.lat,
										user.geoLocation.coordinates.lng
									),
									this.map,
									userIcon
								);
								warehouse.geoLocation = new GeoLocation(
									warehouse.geoLocation
								);
								this.warehouseMarker = this.addMarker(
									new google.maps.LatLng(
										warehouse[
											'geoLocation'
										].coordinates.lat,
										warehouse['geoLocation'].coordinates.lng
									),
									this.map,
									warehouseIcon
								);
								const start = new google.maps.LatLng(
									user.geoLocation.coordinates.lat,
									user.geoLocation.coordinates.lng
								);
								const end = new google.maps.LatLng(
									warehouse['geoLocation'].coordinates.lat,
									warehouse['geoLocation'].coordinates.lng
								);
								const request = {
									origin: start,
									destination: end,
									travelMode: 'DRIVING'
								};

								console.log(request);
								directionsService.route(request, function(
									res,
									stat
								) {
									if (stat === 'OK') {
										directionsDisplay.setDirections(res);
									}
								});
								directionsDisplay.setOptions({
									suppressMarkers: true
								});
								directionsDisplay.setMap(this.map);

								const bounds = new google.maps.LatLngBounds();
								bounds.extend(this.marker.getPosition());
								bounds.extend(
									this.warehouseMarker.getPosition()
								);
								bounds.extend(this.userMarker.getPosition());
								this.map.fitBounds(bounds);

								isWorking = true;
								this.isReverted = false;
							}
						} else {
							if (isWorking) {
								this.revertMap();
								isWorking = false;
							}

							if (!this.isReverted) {
								this.revertMap();
							}
						}
					}, 1500);

					this.map.setCenter(newCoordinates);
					const carierIcon = environment.MAP_CARRIER_ICON_LINK;

					this.marker = this.addMarker(
						newCoordinates,
						this.map,
						carierIcon
					);
				});
		});
	}

	revertMap() {
		this.map.setZoom(15);
		this.warehouseMarker.setMap(null);
		this.userMarker.setMap(null);
		this.isReverted = true;
	}

	showMap() {
		const mapProp = {
			center: new google.maps.LatLng(42.642941, 23.334149),
			zoom: 15,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
	}

	addMarker(position, map, icon) {
		return new google.maps.Marker({
			position,
			map,
			icon
		});
	}

	ngOnDestroy() {
		this.ngDestroy$.next();
		this.ngDestroy$.complete();

		if (this.interval) {
			clearInterval(this.interval);
		}

		if (this.carrierSub$) {
			this.carrierSub$.unsubscribe();
		}

		if (this.params$) {
			this.params$.unsubscribe();
		}
	}
}
