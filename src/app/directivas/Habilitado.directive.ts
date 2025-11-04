import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[habilitado]'
})
export class HabilitadoDirective implements OnInit {
  
  @Input('habilitado') habilitado!: boolean;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    if (this.habilitado === true) {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#C0392B');
      this.renderer.setStyle(this.el.nativeElement, 'color', '#FFFFFF'); 
    } else if (this.habilitado === false) {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#2E7D32');
      this.renderer.setStyle(this.el.nativeElement, 'color', '#FFFFFF'); 
    }
  }
}
