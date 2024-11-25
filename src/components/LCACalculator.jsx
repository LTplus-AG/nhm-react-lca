import React, { useState, useEffect } from 'react';
import { ModelledMaterials, UnmodelledMaterials, OutputFormats, OutputFormatLabels } from '../types/lca.types';
import { LCACalculator } from '../utils/lcaCalculator';
import { fetchKBOBMaterials } from '../services/kbobService';

const calculator = new LCACalculator();

export default function LCACalculatorComponent() {
    const [modelledMaterials, setModelledMaterials] = useState(ModelledMaterials);
    const [unmodelledMaterials, setUnmodelledMaterials] = useState(UnmodelledMaterials);
    const [kbobMaterials, setKbobMaterials] = useState([]);
    const [matches, setMatches] = useState({});
    const [activeTab, setActiveTab] = useState('modelled');
    const [newMaterial, setNewMaterial] = useState({
        name: '',
        volume: ''
    });
    const [results, setResults] = useState({
        totalCO2: 0,
        totalUBP: 0,
        modelledMaterials: 0,
        unmodelledMaterials: 0
    });
    const [outputFormat, setOutputFormat] = useState(OutputFormats.GWP);

    useEffect(() => {
        const loadKBOBMaterials = async () => {
            const materials = await fetchKBOBMaterials();
            setKbobMaterials(materials);
        };
        loadKBOBMaterials();
    }, []);

    useEffect(() => {
        const newResults = calculator.calculateImpact(modelledMaterials, matches, kbobMaterials);
        setResults(newResults);
    }, [matches, modelledMaterials, kbobMaterials]);

    const handleMatch = (modelId, kbobId) => {
        setMatches(prev => ({
            ...prev,
            [modelId]: kbobId
        }));
    };

    const getKbobMaterial = (materialId) => {
        return kbobMaterials.find(k => k.id === matches[materialId]);
    };

    const calculateMaterialImpacts = (material) => {
        const kbobMaterial = getKbobMaterial(material.id);
        return calculator.calculateMaterialImpact(material, kbobMaterial);
    };

    const handleAddMaterial = (e) => {
        e.preventDefault();
        if (newMaterial.name && newMaterial.volume > 0) {
            const newId = Math.max(...unmodelledMaterials.map(m => m.id), 100) + 1;
            setUnmodelledMaterials(prev => [...prev, {
                id: newId,
                name: newMaterial.name,
                volume: parseFloat(newMaterial.volume)
            }]);
            setNewMaterial({ name: '', volume: '' });
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="w-80 bg-white p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-6">Projektübersicht</h2>
                
                <div className="mb-6">
                    <h3 className="font-bold mb-2">Projektname</h3>
                    <p className="text-gray-600">Phase: 99 Beispielphase</p>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold mb-2">Ausgabeformat</h3>
                    <select
                        className="w-full p-2 border rounded-md bg-white"
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                    >
                        {Object.entries(OutputFormatLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold mb-2">Gesamtergebnis</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-3xl font-bold">
                            {calculator.calculateGrandTotal(modelledMaterials, matches, kbobMaterials, outputFormat)}
                        </p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold mb-2">Statistik</h3>
                    <div className="space-y-2 text-sm">
                        <p>Modellierte Materialien: {results.modelledMaterials}</p>
                        <p>Nicht modellierte Materialien: {results.unmodelledMaterials}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white shadow rounded-lg">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Materialien</h2>
                            <div className="flex space-x-2">
                                <button className="px-4 py-2 border rounded-md hover:bg-gray-50">
                                    bearbeiten
                                </button>
                                <button className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800">
                                    senden
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'modelled'
                                        ? 'border-black text-black'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    onClick={() => setActiveTab('modelled')}
                                >
                                    Modellierte Materialen ({modelledMaterials.length})
                                </button>
                                <button
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'unmodelled'
                                        ? 'border-black text-black'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    onClick={() => setActiveTab('unmodelled')}
                                >
                                    Nicht modellierte Materialen ({unmodelledMaterials.length})
                                </button>
                            </nav>
                        </div>

                        {/* Content */}
                        {activeTab === 'modelled' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-5 gap-4 font-bold">
                                    <div>MATERIAL</div>
                                    <div>KBOB MATERIAL</div>
                                    <div>VOLUMEN (m³)</div>
                                    <div>DICHTE (kg/m³)</div>
                                    <div>{OutputFormatLabels[outputFormat]}</div>
                                </div>

                                {modelledMaterials.map(material => {
                                    const impacts = calculateMaterialImpacts(material);
                                    const kbobMaterial = getKbobMaterial(material.id);
                                    return (
                                        <div key={material.id} className="grid grid-cols-5 gap-4 items-center">
                                            <div>{material.name}</div>
                                            <select
                                                className="w-full p-2 border rounded-md"
                                                value={matches[material.id] || ''}
                                                onChange={(e) => handleMatch(material.id, e.target.value)}
                                            >
                                                <option value="">Material auswählen...</option>
                                                {kbobMaterials.map(kbob => (
                                                    <option key={kbob.id} value={kbob.id}>
                                                        {kbob.nameDE} ({kbob.density} {kbob.unit})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                value={material.volume}
                                                className="w-full p-2 border rounded-md"
                                                readOnly
                                            />
                                            <div className="text-right">
                                                {kbobMaterial ? `${kbobMaterial.density} kg/m³` : '-'}
                                            </div>
                                            <div className="text-right">
                                                {calculator.formatImpact(impacts[outputFormat.toLowerCase()], outputFormat)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <form onSubmit={handleAddMaterial} className="grid grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={newMaterial.name}
                                        onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Materialname"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-2 border rounded-md"
                                        value={newMaterial.volume}
                                        onChange={(e) => setNewMaterial(prev => ({ ...prev, volume: e.target.value }))}
                                        placeholder="Volumen (m³)"
                                    />
                                    <button
                                        type="submit"
                                        className="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
                                    >
                                        Material hinzufügen
                                    </button>
                                </form>

                                <div className="mt-8">
                                    <h3 className="text-lg font-medium mb-4">Nicht zugewiesene Materialien</h3>
                                    <div className="space-y-2">
                                        {unmodelledMaterials.map(material => (
                                            <div key={material.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                                <span>{material.name} ({material.volume} m³)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}