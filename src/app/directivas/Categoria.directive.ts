import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[categoria]'
})
export class CategoriaDirective implements OnInit {
  
  @Input('categoria') categoria!: string;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    if (this.categoria === 'paciente') {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#AED6F1'); 
    } else if (this.categoria === 'especialista') {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#FFF3CD');
    } else if (this.categoria === 'administrador') {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#FFB6C1');
    }
    
  }
}
