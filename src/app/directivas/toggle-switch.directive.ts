import { Directive, ElementRef, Input, OnInit, AfterViewInit, Renderer2, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  standalone: true,
  selector: '[appToggleSwitch]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchDirective),
      multi: true
    }
  ]
})
export class ToggleSwitchDirective implements OnInit, AfterViewInit, ControlValueAccessor {
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  
  private checkboxElement?: HTMLInputElement;
  private switchElement?: HTMLSpanElement;
  private labelElement?: HTMLSpanElement;
  private onChange = (value: boolean) => {};
  private onTouched = () => {};
  private _value: boolean = false;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.createToggleStructure();
  }

  private createToggleStructure() {
    const nativeElement = this.el.nativeElement;
    
    // Limpiar el contenido existente
    nativeElement.innerHTML = '';
    
    // Crear el label contenedor
    const labelContainer = this.renderer.createElement('label');
    this.renderer.addClass(labelContainer, 'toggle-label');
    
    // Crear el span para el texto
    if (this.label) {
      this.labelElement = this.renderer.createElement('span');
      this.renderer.setProperty(this.labelElement, 'textContent', this.label);
      this.renderer.appendChild(labelContainer, this.labelElement);
    }
    
    // Crear el checkbox
    this.checkboxElement = this.renderer.createElement('input');
    this.renderer.setAttribute(this.checkboxElement, 'type', 'checkbox');
    this.renderer.addClass(this.checkboxElement, 'toggle-checkbox');
    this.renderer.setProperty(this.checkboxElement, 'checked', this._value);
    this.renderer.setProperty(this.checkboxElement, 'disabled', this.disabled);
    
    // Agregar listener para cambios del checkbox
    this.renderer.listen(this.checkboxElement, 'change', (event: Event) => {
      const target = event.target as HTMLInputElement;
      this._value = target.checked;
      this.onChange(this._value);
      this.onTouched();
    });
    
    this.renderer.appendChild(labelContainer, this.checkboxElement);
    
    // Crear el switch visual
    this.switchElement = this.renderer.createElement('span');
    this.renderer.addClass(this.switchElement, 'toggle-switch');
    this.renderer.appendChild(labelContainer, this.switchElement);
    
    // Agregar el label al elemento host
    this.renderer.appendChild(nativeElement, labelContainer);
    
    // Aplicar estilos al contenedor
    this.renderer.setStyle(nativeElement, 'display', 'block');
  }

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    
    // Si se hace clic en el label o switch (no en el checkbox directamente), 
    // el checkbox se toggleará automáticamente por el comportamiento nativo del label
    // y nuestro listener manejará el cambio
  }

  writeValue(value: boolean): void {
    this._value = value;
    if (this.checkboxElement) {
      this.renderer.setProperty(this.checkboxElement, 'checked', value);
    } else {
      // Si el checkbox aún no está creado, guardar el valor para cuando se cree
      // El valor ya está guardado en this._value
    }
  }
  
  ngAfterViewInit() {
    // Asegurar que el valor inicial se aplique después de crear la estructura
    if (this.checkboxElement) {
      this.renderer.setProperty(this.checkboxElement, 'checked', this._value);
    }
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.checkboxElement) {
      this.renderer.setProperty(this.checkboxElement, 'disabled', isDisabled);
    }
  }
}

