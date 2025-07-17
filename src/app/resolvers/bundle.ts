import { computed, inject, resource, ResourceRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, Data } from '@angular/router';
import { BundleAnalysis } from '../models/bundle.models';
import { BundleService } from '../services/bundle.service';

export type ResolvedBundle = ResourceRef<BundleAnalysis | undefined>;

export function resolveBundle({
  params,
}: ActivatedRouteSnapshot): ResolvedBundle {
  const bundleId = `${params['bundleId']}`;
  const bundleService = inject(BundleService);
  const bundle = resource({
    loader: () => bundleService.loadStoredBundle(bundleId),
  });
  return bundle;
}

export function currentBundle() {
  const route = inject(ActivatedRoute);
  const routeData = toSignal(route.data, {
    initialValue: {} as Data,
  });
  return computed(() => routeData()['bundle'] as ResolvedBundle);
}
