import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DisplayViewerComponent } from './components/display-viewer.component';
import { DashboardEditorComponent } from './components/admin/dashboard-editor.component';
import { DisplayListComponent } from './components/admin/display-list.component';
import { DevicePairingComponent } from './components/pairing/device-pairing.component';
import { WallDropComponent } from './components/walldrop/wall-drop.component';
import { LoginComponent } from './components/auth/login.component';
import { InstallationGuideComponent } from './components/help/installation-guide.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  // Public Kiosk Display route
  { path: 'display/:token', component: DisplayViewerComponent },
  
  // Public WallDrop Mobile Beam Portal
  { path: 'drop/:token', component: WallDropComponent },

  // Public Device Pairing route for TVs, iPads, Pi
  { path: 'display', component: DevicePairingComponent },
  { path: 'pair', component: DevicePairingComponent },

  // Public Hardware & Client Installation Guide (Printable / PDF)
  { path: 'docs/installation', component: InstallationGuideComponent },

  // Admin Authentication
  { path: 'admin/login', component: LoginComponent },
  { path: 'admin/register', component: LoginComponent },
  
  // Multi-Display Fleet Management Dashboard
  { 
    path: 'admin/displays', 
    component: DisplayListComponent,
    canActivate: [AuthGuard]
  },

  // Protected Canvas & Widget Editor
  { 
    path: 'admin/editor/:token', 
    component: DashboardEditorComponent,
    canActivate: [AuthGuard]
  },
  
  { path: '', redirectTo: 'admin/displays', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
