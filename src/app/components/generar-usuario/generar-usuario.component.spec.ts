import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerarUsuarioComponent } from './generar-usuario.component';

describe('GenerarUsuarioComponent', () => {
  let component: GenerarUsuarioComponent;
  let fixture: ComponentFixture<GenerarUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerarUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerarUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
