import { Component, OnDestroy, OnInit, Input, OnChanges } from '@angular/core';
import { UserOrdersRouter } from '@modules/client.common.angular2/routers/user-orders-router.service';
import { ActivatedRoute } from '@angular/router';
import { LocalDataSource } from 'ng2-smart-table';
import Order from '@modules/server.common/entities/Order';
import { DatePipe } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { RedirectStoreComponent } from '../../../../@shared/render-component/customer-orders-table/redirect-store.component';
import { RedirectCarrierComponent } from '../../../../@shared/render-component/customer-orders-table/redirect-carrier.component';
import { RedirectOrderComponent } from '../../../../@shared/render-component/customer-orders-table/redirect-order.component';
import { RedirectProductComponent } from '../../../../@shared/render-component/customer-orders-table/redirect-product.component';
import { CustomerOrderActionsComponent } from '../../../../@shared/render-component/customer-orders-table/customer-order-actions.component';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, Subject, Observable } from 'rxjs';

@Component({
	selector: 'ea-customer-orders',
	styleUrls: ['./ea-customer-orders.component.scss'],
	template: `
		<nb-card>
			<nb-card-body>
				<ng2-smart-table
					[settings]="settingsSmartTable"
					[source]="sourceSmartTable"
				></ng2-smart-table>
			</nb-card-body>
		</nb-card>
	`
})
export class CustomerOrdersComponent implements OnDestroy, OnInit, OnChanges {
	private ngDestroy$ = new Subject<void>();

	@Input()
	userId: string;

	settingsSmartTable: object;
	sourceSmartTable: LocalDataSource = new LocalDataSource();

	params$: any;
	orderedProductsSubscription$: any;

	constructor(
		private userOrdersRouter: UserOrdersRouter,
		private readonly _router: ActivatedRoute,
		private _translateService: TranslateService
	) {
		this.params$ = this._router.params.subscribe(async (res) => {
			const userId = res.id;

			this.orderedProductsSubscription$ = this.userOrdersRouter
				.get(userId)
				.subscribe((orders) => {
					this.sourceSmartTable.load(orders);
				});
		});
		this._applyTranslationOnSmartTable();
	}

	ngOnInit(): void {
		this._setupSmartTable();
	}

	ngOnChanges() {
		if (this.userId) {
			this.orderedProductsSubscription$ = this.userOrdersRouter
				.get(this.userId)
				.subscribe((orders) => {
					this.sourceSmartTable.load(orders);
				});
		}
	}

	private _applyTranslationOnSmartTable() {
		this._translateService.onLangChange.subscribe(() => {
			this._setupSmartTable();
		});
	}

	private _setupSmartTable() {
		const columnTitlePrefix = 'CUSTOMERS_VIEW.SMART_TABLE_COLUMNS.';
		const getTranslate = (name: string): Observable<string | any> =>
			this._translateService.get(columnTitlePrefix + name);

		forkJoin(
			this._translateService.get('Id'),
			getTranslate('ORDER_NUMBER'),
			getTranslate('WAREHOUSE'),
			getTranslate('CARRIER'),
			getTranslate('PRODUCT_LIST'),
			getTranslate('STATS'),
			getTranslate('DELIVERY_TIME'),
			getTranslate('CREATED'),
			getTranslate('ACTIONS'),
			getTranslate('PAID'),
			getTranslate('COMPLETED'),
			getTranslate('CANCELLED'),
			getTranslate('NOT_DELIVERED')
		)
			.pipe(takeUntil(this.ngDestroy$))
			.subscribe(
				([
					id,
					orderNumber,
					warehouse,
					carrier,
					productList,
					stats,
					deliveryTime,
					created,
					actions,
					paid,
					completed,
					cancelled,
					notDelivered
				]) => {
					this.settingsSmartTable = {
						actions: false,
						columns: {
							orderNumber: {
								title: orderNumber,
								type: 'custom',
								renderComponent: RedirectOrderComponent
							},
							Warehouse: {
								title: warehouse,
								type: 'custom',
								renderComponent: RedirectStoreComponent
							},
							Carrier: {
								title: carrier,
								type: 'custom',
								renderComponent: RedirectCarrierComponent
							},
							ProductsList: {
								title: productList,
								type: 'custom',
								renderComponent: RedirectProductComponent
							},
							Stats: {
								title: stats,
								type: 'html',
								valuePrepareFunction: (_, order: Order) => {
									if (order.isCancelled) {
										return `
									<h6 > <span class='warnCancelled'>${cancelled}</span></h6>
									`;
									} else {
										return `
									<h6 > <span class=' space'>${completed}</span>${
											order.isCompleted ? '✔' : '✘'
										}</h6>
									<h6> <span class='space'>${paid}</span>${order.isPaid ? '✔' : '✘'}</h6>
									`;
									}
								}
							},
							DeliveryTime: {
								title: deliveryTime,
								type: 'html',
								valuePrepareFunction: (_, order: Order) => {
									const raw: Date = new Date(
										order.deliveryTime
									);
									const formatted: string = order.deliveryTime
										? new DatePipe('en-EN').transform(
												raw,
												'short'
										  )
										: `${notDelivered}`;
									return `<h6>${formatted}</h6>`;
								}
							},
							Created: {
								title: created,
								type: 'html',
								valuePrepareFunction: (_, order: Order) => {
									const raw: Date = new Date(
										order._createdAt.toString()
									);
									const formatted: string = new DatePipe(
										'en-EN'
									).transform(raw, 'short');
									return `<h6>${formatted}</h6>`;
								}
							},
							actions: {
								title: actions,
								type: 'custom',
								renderComponent: CustomerOrderActionsComponent
							}
						},
						pager: {
							display: true,
							perPage: 3
						}
					};
				}
			);
	}

	ngOnDestroy(): void {
		if (this.params$) {
			this.params$.unsubscribe();
		}
		if (this.orderedProductsSubscription$) {
			this.orderedProductsSubscription$.unsubscribe();
		}
	}
}
