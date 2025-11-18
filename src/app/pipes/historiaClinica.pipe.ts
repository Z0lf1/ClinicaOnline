//import { Pipe, PipeTransform } from '@angular/core';

// @Pipe({
//   name: 'historiaClinica'
// })
// export class HistoriaClinicaPipe implements PipeTransform {

//   transform(turnos: any[], busqueda: string): any[] {
//     if (!busqueda || busqueda.trim() === '') {
//       return turnos;
//     }


    
//     const texto = busqueda.toLowerCase();

//     return turnos.filter(turno => {
//       const historia = turno.historiaClinica;
//       if (!historia) return false;
      
//       //campos fijos
//       const camposFijos = ['altura', 'peso', 'temperatura', 'presion'];
//       for (const campo of camposFijos) {
//         const valor = historia[campo];
//         if (valor && valor.toString().toLowerCase().includes(texto)) {
//           return true;
//         }
//       }

//       // campos dinámicos 
//     const datos = historia.datos_dinamicos;
//     if (datos && typeof datos === 'object') {
//       for (const key in datos) {
//         const valor = datos[key];
//         if (valor && valor.toString().toLowerCase().includes(texto)) {
//           return true;
//         }
//       }
//     }


//       return false;
//     });
//   }
    
// }


// import { Pipe, PipeTransform } from '@angular/core';

// @Pipe({
//   name: 'historiaClinica',
//   standalone: true
// })
// export class HistoriaClinicaPipe implements PipeTransform {

//   transform(turnos: any[], busqueda: string): any[] {
//     if (!busqueda || busqueda.trim() === '') {
//       return turnos;
//     }

//     const texto = busqueda.toLowerCase();

//     return turnos.filter(turno => {
//       const historia = turno.historiaClinica;
//       if (!historia) return false;

//       // ----- BÚSQUEDA EN CAMPOS PRINCIPALES -----
//       const campos = [
//         historia.altura?.toString().toLowerCase() || '',
//         historia.peso?.toString().toLowerCase() || '',
//         historia.temperatura?.toString().toLowerCase() || '',
//         historia.presion?.toString().toLowerCase() || ''
//       ];

//       if (campos.some(c => c.includes(texto))) return true;

//       // ----- BÚSQUEDA EN datos_dinamicos -----
//       const dinamicos = historia.datos_dinamicos;
// //console.log("DINAMICOS RECIBIDOS:", dinamicos);
//       if (dinamicos && typeof dinamicos === 'object') {
//         for (const key in dinamicos) {

//           const k = key.toLowerCase();
//           const v = dinamicos[key]?.toString().toLowerCase() ?? '';

//           // Coincidencia por KEY
//           if (k.includes(texto)) return true;

//           // Coincidencia por VALUE
//           if (v.includes(texto)) return true;
//         }
//       }

//       return false;
//     });
//   }
// }

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'historiaClinica',
  standalone: true
})
export class HistoriaClinicaPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    if (!busqueda || busqueda.trim() === '') {
      return turnos;
    }

    const texto = busqueda.toLowerCase();

    return turnos.filter(turno => {
      const historia = turno.historiaClinica;
      console.log(
    'TURNO:',
    turno,
    '\nHISTORIA CLINICA:',
    historia,
    '\nDATOS DINAMICOS (crudo):',
    historia?.datos_dinamicos,
    '\nTIPO:',
    typeof historia?.datos_dinamicos
  );
      if (!historia) return false;

      // ----- BÚSQUEDA EN CAMPOS PRINCIPALES -----
      const campos = [
        historia.altura?.toString().toLowerCase() || '',
        historia.peso?.toString().toLowerCase() || '',
        historia.temperatura?.toString().toLowerCase() || '',
        historia.presion?.toString().toLowerCase() || ''
      ];

      if (campos.some(c => c.includes(texto))) return true;

      // =====================================================
      // 🔥 Convertir datos_dinamicos STRING → OBJETO
      // =====================================================
      let dinamicos = historia.datos_dinamicos;

      if (typeof dinamicos === 'string') {
        try {
          dinamicos = JSON.parse(dinamicos);   // ← AQUÍ SE SOLUCIONA
        } catch (e) {
          return false; // si no se puede parsear, no filtra nada
        }
      }

      // ----- BÚSQUEDA EN datos_dinamicos -----
      if (dinamicos && typeof dinamicos === 'object') {
        for (const key in dinamicos) {

          const k = key.toLowerCase();
          const v = dinamicos[key]?.toString().toLowerCase() ?? '';

          if (k.includes(texto)) return true;
          if (v.includes(texto)) return true;
        }
      }

      return false;
    });
  }
}
