import React, { useState, useEffect } from 'react';
import {
    getCompilerVersions,
    solidityCompiler,
} from '@agnostico/browser-solidity-compiler';
import Button from './components/Button';
import ContractDeploymentEnergyCalculator from './ContractDeploymentEnergyCalculator';
import ContractDeployer from './ContractDeployer'; // Import ContractDeployer

// Previous type definitions remain the same
type BuildType = { version: string; path: string };
type VersionType = { [version: string]: string };

interface AbiInput {
    name?: string;
    type: string;
    internalType?: string;
}

interface AbiItem {
    type: string;
    name?: string;
    inputs?: AbiInput[];
    outputs?: AbiInput[];
    stateMutability?: string;
}

interface SolcVersions {
    releases: VersionType;
    latestRelease: string;
    builds: Record<string, string>[];
}

interface CompiledContract {
    errors: { formattedMessage: string }[];
    sources: Record<string, unknown> | null;
    contracts: {
        Compiled_Contracts?: Record<string, {
            evm: {
                bytecode: {
                    object: string;
                };
            };
            abi: AbiItem[];
        }>;
    } | null;
}

interface OptimizerOptions {
    optimize: boolean;
    runs: number;
}

function ContractDetails({ contract, contractName }: { 
    contract: { 
        evm: { bytecode: { object: string } }; 
        abi: AbiItem[] 
    }, 
    contractName: string 
}) {
    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700">
                Compiled Contract ({contractName}):
            </h2>
            <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600 overflow-auto break-all">
                {contract.evm?.bytecode?.object &&  <p className="text-lg font-semibold text-gray-700">Bytecode:</p> }
                    {contract.evm?.bytecode?.object}
                </div>
                <div className="mt-4">
                   {contract.abi && contract.abi.length > 0 && <h3 className="text-lg font-semibold text-gray-700">ABI</h3> }
                    {contract.abi && contract.abi.length > 0 && (
                        <ul className="list-disc pl-6 text-gray-600">
                            {contract.abi.map((item: AbiItem, idx: number) => (
                                <li key={idx} className="mb-4">
                                    <p>
                                        <strong>Type:</strong> {item.type}
                                        {item.name && <>, <strong>Name:</strong> {item.name}</>}
                                    </p>
                                    {item.inputs && item.inputs.length > 0 && (
                                        <div className="ml-4">
                                            <p className="text-sm"><strong>Inputs:</strong></p>
                                            <ul className="list-disc pl-4">
                                                {item.inputs.map((input: AbiInput, i: number) => (
                                                    <li key={i}>
                                                        {input.name ? (
                                                            <>
                                                                <strong>{input.name}</strong> ({input.internalType || "N/A"})
                                                            </>
                                                        ) : (
                                                            `Unnamed parameter (${input.internalType || "N/A"})`
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {item.outputs && item.outputs.length > 0 && (
                                        <div className="ml-4">
                                            <p className="text-sm"><strong>Outputs:</strong></p>
                                            <ul className="list-disc pl-4">
                                                {item.outputs.map((output: AbiInput, i: number) => (
                                                    <li key={i}>
                                                        <strong>{output.type}</strong> ({output.internalType || "N/A"})
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <p className="text-sm">
                                        <strong>State Mutability:</strong> {item.stateMutability || "N/A"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

function SolidityCompiler(): React.JSX.Element {
    const [solcVersions, setSolcVersions] = useState<SolcVersions | null>(null);
    const [compiledContract, setCompiledContract] = useState<CompiledContract>({
        errors: [],
        sources: null,
        contracts: null,
    });
    const [optimizeOption, setOptimizer] = useState<OptimizerOptions>({
        optimize: false,
        runs: 200,
    });
    const [usingVersion, setUsingVersion] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [selectedContract, setSelectedContract] = useState<string>('');
    const [isCompiling, setIsCompiling] = useState(false);
    const [bytecode, setBytecode] = useState(''); // State for Bytecode
    const [contractAbi, setContractAbi] = useState(''); // State for Contract ABI

    const loadVersions = async (): Promise<void> => {
        try {
            const { releases, latestRelease, builds } = await getCompilerVersions() as {
                releases: VersionType;
                latestRelease: string;
                builds: BuildType[];
            };

            setSolcVersions({
                releases,
                latestRelease,
                builds: builds.map(({ version, path }) => ({ [version]: path })),
            });
            setUsingVersion(releases[latestRelease]);
        } catch (error) {
            console.error('Failed to load compiler versions:', error);
            setCompiledContract(prev => ({
                ...prev,
                errors: [{ formattedMessage: 'Failed to load compiler versions' }]
            }));
        }
    };

    useEffect(() => {
        void loadVersions();
    }, []);

    const handleDeployment = async (): Promise<void> => {
        
        setIsCompiling(true);
        if (!content.trim()) {
            setCompiledContract({
                errors: [{ formattedMessage: 'Please enter contract code' }],
                sources: null,
                contracts: null
            });
            setIsCompiling(false);
            return;
        }

        const options: Record<string, unknown> = {};
        if (optimizeOption.optimize) {
            options.optimizer = {
                enabled: optimizeOption.optimize,
                runs: optimizeOption.runs,
            };
        }

        try {
            const compiled = await solidityCompiler({
                version: `https://binaries.soliditylang.org/bin/${usingVersion}`,
                contractBody: content,
                options,
            }) as CompiledContract;

            setCompiledContract(compiled);
            
            // Set the first contract as selected by default if there are any contracts
            if (compiled.contracts?.Compiled_Contracts) {
                const contractNames = Object.keys(compiled.contracts.Compiled_Contracts);
                setSelectedContract(contractNames[0] || '');
                const selectedContract = compiled.contracts.Compiled_Contracts[contractNames[0]];
                setBytecode(selectedContract.evm.bytecode.object);
                setContractAbi(JSON.stringify(selectedContract.abi));
            }
    
        } catch (e: unknown) {
            setCompiledContract({
                errors: [{
                    formattedMessage: e instanceof Error ? e.message : 'Unknown compilation error'
                }],
                sources: null,
                contracts: null
            });
        
        } finally {
            setIsCompiling(false);
        }
    };

    const contracts = compiledContract.contracts?.Compiled_Contracts || {};
    const contractNames = Object.keys(contracts);
    const hasMultipleContracts = contractNames.length > 1;

    const handleContractChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const contractName = event.target.value;
        const contract = contracts[contractName];
        setSelectedContract(contractName);
        setBytecode(contract.evm.bytecode.object);
        setContractAbi(JSON.stringify(contract.abi));
    };

    return (
        <main className="flex flex-col items-center p-36 space-y-6 bg-gray-50">
            <h1 className="text-3xl font-semibold text-gray-700 mb-4">Solidity Compiler</h1>

            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Contract Code:</h2>
                    <textarea
                        className="w-full h-40 p-4 border rounded-lg text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter your raw contract code here..."
                    />
                </div>

                <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Settings:</h2>

                    <div className="mb-6">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-black focus:ring-red-400 border-gray-300 rounded"
                                checked={optimizeOption.optimize}
                                onChange={(e) =>
                                    setOptimizer((prev) => ({
                                        ...prev,
                                        optimize: e.target.checked,
                                    }))
                                }
                            />
                            <span className="text-gray-700">Enable Optimization</span>
                        </label>

                        {optimizeOption.optimize && (
                            <div className="mt-4">
                                <label className="block text-gray-600">Enter Number of Runs:</label>
                                <input
                                    type="number"
                                    className="w-full mt-2 p-2 text-black border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    value={optimizeOption.runs}
                                    onChange={(e) =>
                                        setOptimizer((prev) => ({ ...prev, runs: Number(e.target.value) }))
                                    }
                                    min="1"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="mb-2 text-gray-700">Select Solidity Version</p>
                        {solcVersions?.releases && (
                            <select
                                className="w-full p-2 border rounded-lg text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                                value={Object.keys(solcVersions.releases).find(
                                    (key) => solcVersions.releases[key] === usingVersion
                                )}
                                onChange={(e) => setUsingVersion(solcVersions.releases[e.target.value])}
                            >
                                {Object.keys(solcVersions.releases).map((option) => (
                                    <option key={option} value={option}>
                                        {option} ({solcVersions.releases[option]})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="text-center mt-6">
                    <Button
                        type="button"
                        onClick={handleDeployment}
                        isLoading={isCompiling}
                        loadingText="Compiling..."
                        disabled={!usingVersion || !content.trim()}
                    >
                        Compile
                    </Button>
                </div>

                {contractNames.length > 0 && (
                    <div className="my-8">
                        {hasMultipleContracts && (
                            <div className="mb-6">
                                <label className="block text-gray-700 mb-2">Select Contract:</label>
                                <select
                                    className="w-full p-2 border rounded-lg text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    value={selectedContract}
                                    onChange={handleContractChange}
                                >
                                    <option value="">Select Contract</option>
                                    {contractNames.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedContract && contracts[selectedContract] && (
                            <ContractDetails 
                                contract={contracts[selectedContract]} 
                                contractName={selectedContract} 
                            />
                        )}
                    </div>
                )}

                {selectedContract && contracts[selectedContract] && contractAbi && bytecode && (
                    <div>
                        <ContractDeployer 
                            bytecode={bytecode} 
                            contractAbi={contractAbi} 
                        />
                        <ContractDeploymentEnergyCalculator 
                            bytecode={bytecode} 
                            contractAbi={contractAbi} 
                        />
                    </div>
                )}

                <div className="mt-4">
                    {compiledContract?.errors?.length > 0 && (
                        <>
                            <h2 className="text-lg font-semibold text-black">Errors</h2>
                            <ul className="list-disc pl-6 text-red-500 p-2 border border-red-300 rounded mt-2">
                                {compiledContract.errors.map((err, idx) => (
                                    <li key={idx}>{err.formattedMessage}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

export default SolidityCompiler;