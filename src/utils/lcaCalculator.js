import { OutputFormats } from '../types/lca.types';

export class LCACalculator {
    calculateImpact(materials, matches, kbobMaterials, unmodelledMaterials = []) {
        let results = {
            gwp: 0,
            ubp: 0,
            penr: 0,
            modelledMaterials: 0,
            unmodelledMaterials: 0
        };

        // Calculate impacts for modelled materials
        materials.forEach(material => {
            const kbobMaterial = kbobMaterials.find(k => k.id === matches[material.id]);
            const impacts = this.calculateMaterialImpact(material, kbobMaterial);

            if (impacts.gwp > 0 || impacts.ubp > 0 || impacts.penr > 0) {
                results.gwp += impacts.gwp;
                results.ubp += impacts.ubp;
                results.penr += impacts.penr;
                results.modelledMaterials += 1;
            } else {
                results.unmodelledMaterials += 1;
            }
        });

        // Calculate impacts for unmodelled materials
        unmodelledMaterials.forEach(material => {
            const kbobMaterial = kbobMaterials.find(k => k.id === material.kbobId);
            if (kbobMaterial) {
                const impacts = this.calculateMaterialImpact(material, kbobMaterial);
                results.gwp += impacts.gwp;
                results.ubp += impacts.ubp;
                results.penr += impacts.penr;
                results.unmodelledMaterials += 1;
            }
        });

        return results;
    }

    calculateMaterialImpact(material, kbobMaterial) {
        if (!material || !kbobMaterial) {
            return { gwp: 0, ubp: 0, penr: 0 };
        }

        const volume = material.volume;
        const density = kbobMaterial.density;
        const mass = density ? volume * density : volume;

        return {
            gwp: mass * kbobMaterial.gwp,
            ubp: mass * kbobMaterial.ubp,
            penr: mass * kbobMaterial.penr
        };
    }

    formatImpact(value, type) {
        if (typeof value !== 'number') return '0';

        switch (type) {
            case OutputFormats.GWP:
                return `${value.toFixed(2)} kg CO₂-eq`;
            case OutputFormats.UBP:
                return `${value.toFixed(0)} UBP`;
            case OutputFormats.PENR:
                return `${value.toFixed(2)} MJ`;
            default:
                return value.toString();
        }
    }

    calculateGrandTotal(materials, matches, kbobMaterials, outputFormat, unmodelledMaterials = []) {
        const results = this.calculateImpact(materials, matches, kbobMaterials, unmodelledMaterials);
        const value = results[outputFormat.toLowerCase()];
        return this.formatImpact(value, outputFormat);
    }


}
