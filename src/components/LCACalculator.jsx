import React, { useState, useEffect } from "react";
import {
  ModelledMaterials,
  UnmodelledMaterials,
  OutputFormats,
  OutputFormatLabels,
  EBKPCodes,
} from "../types/lca.types";
import { LCACalculator } from "../utils/lcaCalculator";
import { fetchKBOBMaterials } from "../services/kbobService";
import Select from "react-select";

const calculator = new LCACalculator();

export default function LCACalculatorComponent() {
  const [modelledMaterials, setModelledMaterials] = useState(ModelledMaterials);
  const [unmodelledMaterials, setUnmodelledMaterials] =
    useState(UnmodelledMaterials);
  const [kbobMaterials, setKbobMaterials] = useState([]);
  const [matches, setMatches] = useState({});
  const [activeTab, setActiveTab] = useState("modelled");
  const [newMaterial, setNewMaterial] = useState({
    kbobId: "",
    name: "",
    volume: "",
    ebkp: "",
  });
  const [results, setResults] = useState({
    totalCO2: 0,
    totalUBP: 0,
    modelledMaterials: 0,
    unmodelledMaterials: 0,
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
    const newResults = calculator.calculateImpact(
      modelledMaterials,
      matches,
      kbobMaterials,
      unmodelledMaterials
    );
    setResults(newResults);
  }, [matches, modelledMaterials, kbobMaterials, unmodelledMaterials]);

  const handleMatch = (modelId, kbobId) => {
    setMatches((prev) => {
      const newMatches = { ...prev };
      if (kbobId === undefined) {
        delete newMatches[modelId];
      } else {
        newMatches[modelId] = kbobId;
      }
      return newMatches;
    });
  };

  const getKbobMaterial = (materialId) => {
    return kbobMaterials.find((k) => k.id === matches[materialId]);
  };

  const calculateMaterialImpacts = (material) => {
    const kbobMaterial = getKbobMaterial(material.id);
    return calculator.calculateMaterialImpact(material, kbobMaterial);
  };

  const handleAddMaterial = (e) => {
    e.preventDefault();
    if (newMaterial.kbobId && newMaterial.volume > 0) {
      const newId = Math.max(...unmodelledMaterials.map((m) => m.id), 100) + 1;
      const kbobMaterial = kbobMaterials.find(
        (k) => k.id === newMaterial.kbobId
      );
      setUnmodelledMaterials((prev) => [
        ...prev,
        {
          id: newId,
          kbobId: newMaterial.kbobId,
          name: kbobMaterial?.nameDE || newMaterial.name,
          volume: parseFloat(newMaterial.volume),
          ebkp: newMaterial.ebkp,
        },
      ]);
      setNewMaterial({ kbobId: "", name: "", volume: "", ebkp: "" });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Projektübersicht</h2>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Juch-Areal</h3>
          <p className="text-gray-600">Phase: 31 Vorprojekt</p>
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
              {calculator.calculateGrandTotal(
                modelledMaterials,
                matches,
                kbobMaterials,
                outputFormat,
                unmodelledMaterials
              )}
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
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "modelled"
                      ? "border-black text-black"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setActiveTab("modelled")}
                >
                  Modellierte Materialien ({modelledMaterials.length})
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "unmodelled"
                      ? "border-black text-black"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setActiveTab("unmodelled")}
                >
                  Nicht modellierte Materialien ({unmodelledMaterials.length})
                </button>
              </nav>
            </div>

            {/* Content */}
            {activeTab === "modelled" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-[150px_200px_100px_100px_100px] gap-4 font-bold">
                  <div>MATERIAL</div>
                  <div>KBOB MATERIAL</div>
                  <div>VOLUMEN (m³)</div>
                  <div>DICHTE (kg/m³)</div>
                  <div>{OutputFormatLabels[outputFormat]}</div>
                </div>

                {modelledMaterials.map((material) => {
                  const impacts = calculateMaterialImpacts(material);
                  const kbobMaterial = getKbobMaterial(material.id);
                  return (
                    <div
                      key={material.id}
                      className="grid grid-cols-[150px_200px_100px_100px_100px] gap-4 items-center"
                    >
                      <input
                        type="text"
                        value={material.name}
                        title={material.name}
                        className="w-full p-2 border rounded-md text-center bg-gray-50 cursor-not-allowed"
                        readOnly
                      />
                      <Select
                        className="w-full"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderRadius: "0.375rem",
                            borderColor: "rgba(209, 213, 219, 1)",
                            boxShadow: "none",
                            "&:hover": {
                              borderColor: "rgba(156, 163, 175, 1)",
                            },
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                              ? "rgba(229, 231, 235, 1)"
                              : state.isFocused
                              ? "rgba(243, 244, 246, 1)"
                              : "white",
                            color: "black",
                          }),
                          menu: (provided) => ({
                            ...provided,
                            borderRadius: "0.375rem",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                          }),
                        }}
                        options={kbobMaterials.map((kbob) => ({
                          value: kbob.id,
                          label: `${kbob.nameDE} (${kbob.density} ${kbob.unit})`,
                        }))}
                        value={
                          kbobMaterials.find(
                            (kbob) => kbob.id === matches[material.id]
                          )
                            ? {
                                value: matches[material.id],
                                label: `${
                                  kbobMaterials.find(
                                    (kbob) => kbob.id === matches[material.id]
                                  ).nameDE
                                } (${
                                  kbobMaterials.find(
                                    (kbob) => kbob.id === matches[material.id]
                                  ).density
                                } ${
                                  kbobMaterials.find(
                                    (kbob) => kbob.id === matches[material.id]
                                  ).unit
                                })`,
                              }
                            : null
                        }
                        onChange={(selectedOption) =>
                          handleMatch(material.id, selectedOption?.value)
                        }
                        placeholder="Material auswählen..."
                        isClearable
                      />
                      <input
                        type="number"
                        value={material.volume}
                        title={material.volume}
                        className="w-full p-2 border rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center bg-gray-50 cursor-not-allowed"
                        readOnly
                      />
                      <div className="text-right">
                        {kbobMaterial ? `${kbobMaterial.density} kg/m³` : "-"}
                      </div>
                      <div className="text-right">
                        {calculator.formatImpact(
                          impacts[outputFormat.toLowerCase()],
                          outputFormat
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 font-bold">
                  <div>KBOB MATERIAL</div>
                  <div>EBKP CODE</div>
                  <div>VOLUMEN (m³)</div>
                  <div></div>
                </div>
                <form
                  onSubmit={handleAddMaterial}
                  className="grid grid-cols-[3fr_1fr_1fr_1fr] gap-4"
                >
                  <Select
                    className="w-full"
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: "0.375rem",
                        borderColor: "rgba(209, 213, 219, 1)",
                        boxShadow: "none",
                        "&:hover": {
                          borderColor: "rgba(156, 163, 175, 1)",
                        },
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isSelected
                          ? "rgba(229, 231, 235, 1)"
                          : state.isFocused
                          ? "rgba(243, 244, 246, 1)"
                          : "white",
                        color: "black",
                      }),
                      menu: (provided) => ({
                        ...provided,
                        borderRadius: "0.375rem",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }),
                    }}
                    options={kbobMaterials.map((kbob) => ({
                      value: kbob.id,
                      label: kbob.nameDE,
                    }))}
                    value={
                      kbobMaterials.find(
                        (kbob) => kbob.id === newMaterial.kbobId
                      )
                        ? {
                            value: newMaterial.kbobId,
                            label: kbobMaterials.find(
                              (kbob) => kbob.id === newMaterial.kbobId
                            ).nameDE,
                          }
                        : null
                    }
                    onChange={(selectedOption) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        kbobId: selectedOption?.value,
                        name: selectedOption?.label,
                      }))
                    }
                    placeholder="KBOB Material auswählen..."
                    isClearable
                  />
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newMaterial.ebkp || ""}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        ebkp: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">EBKP Code auswählen...</option>
                    {Object.entries(EBKPCodes).map(([code]) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center bg-white"
                    value={newMaterial.volume}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        volume: e.target.value,
                      }))
                    }
                    placeholder="Volumen"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    Hinzufügen
                  </button>
                </form>

                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">
                    Nicht zugewiesene Materialien
                  </h3>
                  <div className="grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 font-bold mb-2">
                    <div>MATERIAL</div>
                    <div>EBKP CODE</div>
                    <div>VOLUMEN (m³)</div>
                    <div></div>
                  </div>
                  {unmodelledMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 items-center py-2 border-b"
                    >
                      <input
                        type="text"
                        value={material.name}
                        title={material.name}
                        className="w-full p-2 border-0 text-center bg-gray-50 cursor-not-allowed"
                        readOnly
                      />
                      <div>{material.ebkp || "-"}</div>
                      <input
                        type="number"
                        value={material.volume}
                        title={material.volume}
                        className="w-full p-2 border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center bg-gray-50 cursor-not-allowed"
                        readOnly
                      />
                      <button
                        onClick={() => {
                          setUnmodelledMaterials((prev) =>
                            prev.filter((m) => m.id !== material.id)
                          );
                        }}
                        className="justify-self-end px-2 py-1 text-red-600 hover:text-red-800"
                      >
                        Löschen
                      </button>
                      <div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
