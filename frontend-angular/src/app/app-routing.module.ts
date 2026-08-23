import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DisplayViewerComponent } from './components/display-viewer.component';
import { DashboardEditorComponent } from './components/admin/dashboard-editor.component';
import { LoginComponent } from './components/auth/login.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  // Public Kiosk route for Raspberry Pi
  { path: 'display/:token', component: DisplayViewerComponent },

  // Admin Authentication
  { path: 'admin/login', component: LoginComponent },
  
  // Protected Admin Editor
  { 
    path: 'admin/editor/:token', 
    component: DashboardEditorComponent,
    canActivate: [AuthGuard]
  },
  
  { path: '', redirectTo: 'admin/login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
