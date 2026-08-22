import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DisplayViewerComponent } from './components/display-viewer.component';
import { DashboardEditorComponent } from './components/admin/dashboard-editor.component';

const routes: Routes = [
  // Route loaded by the Raspberry Pi kiosk
  { path: 'display/:token', component: DisplayViewerComponent },
  
  // Route used from your browser to configure widgets and layout
  { path: 'admin/editor/:token', component: DashboardEditorComponent },
  
  { path: '', redirectTo: 'admin/editor/default-token', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
