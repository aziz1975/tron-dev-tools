import React, { useState, useEffect } from 'react';
import {
    getCompilerVersions,
    solidityCompiler,
} from '@agnostico/browser-solidity-compiler';
import Button from './components/Button';
import {
    Card,
    Grid,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import ContractDeploymentEnergyCalculator from './ContractDeploymentEnergyCalculator';
import ContractDeployer from './ContractDeployer';

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
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h6" className="mb-4 text-gray-700 font-bold">Compiled Contract ({contractName}):</Typography>
            </Grid>
            <Grid item xs={12}>
                <Card className="p-4 border rounded-lg">
                    <Button onClick={toggleVisibility} variant="primary" color="primary" className="mb-4">
                        {isVisible ? 'Hide' : 'Show'} Details
                    </Button>
                    {isVisible && (
                        <div>
                            <Typography variant="body1" className="text-gray-600 overflow-auto break-all">
                                {contract.evm?.bytecode?.object && <Typography variant="h6" className="font-semibold text-gray-700">Bytecode:</Typography>}
                                {contract.evm?.bytecode?.object}
                            </Typography>
                            <div className="mt-4">
                                {contract.abi && contract.abi.length > 0 && <Typography variant="h6" className="font-semibold text-gray-700">ABI</Typography>}
                                {contract.abi && contract.abi.length > 0 && (
                                    <ul className="list-disc pl-6 text-gray-600">
                                        {contract.abi.map((item: AbiItem, idx: number) => (
                                            <li key={idx} className="mb-4">
                                                <Typography variant="body2">
                                                    <strong>Type:</strong> {item.type}
                                                    {item.name && <>, <strong>Name:</strong> {item.name}</>}
                                                </Typography>
                                                {item.inputs && item.inputs.length > 0 && (
                                                    <div className="ml-4">
                                                        <Typography variant="body2"><strong>Inputs:</strong></Typography>
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
                                                        <Typography variant="body2"><strong>Outputs:</strong></Typography>
                                                        <ul className="list-disc pl-4">
                                                            {item.outputs.map((output: AbiInput, i: number) => (
                                                                <li key={i}>
                                                                    <strong>{output.type}</strong> ({output.internalType || "N/A"})
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <Typography variant="body2" className="text-sm">
                                                    <strong>State Mutability:</strong> {item.stateMutability || "N/A"}
                                                </Typography>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </Grid>
        </Grid>
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
    const [bytecode, setBytecode] = useState('');
    const [contractAbi, setContractAbi] = useState('');

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
        <main className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
                <Typography variant="h4" style={{ color: '#333', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
                    Solidity Compiler
                </Typography>

                <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                    <div className="mb-6">

                        <TextField
                            label="Contract Code"
                            multiline
                            rows={4}
                            variant="outlined"
                            fullWidth
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter your raw contract code here..."
                            aria-label="Contract code input"
                        />
                    </div>

                    <div className="w-full max-w-4xl rounded-lg p-2">


                        <div className="mb-6">
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
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
                                        <Typography variant="body1" className="text-gray-700">Enable Optimization</Typography>
                                    </label>
                                </Grid>
                                {optimizeOption.optimize && (
                                    <Grid item xs={12} sm={6}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label="Number of Runs"
                                                    type="number"
                                                    variant="outlined"
                                                    fullWidth
                                                    value={optimizeOption.runs}
                                                    onChange={(e) =>
                                                        setOptimizer((prev) => ({ ...prev, runs: Number(e.target.value) }))
                                                    }
                                                    inputProps={{
                                                        min: 1,
                                                        max: 200,
                                                    }}
                                                    placeholder="Enter runs"
                                                    aria-label="Number of runs"
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                )}
                            </Grid>
                        </div>

                        <div>

                            {solcVersions?.releases && (
                                <FormControl variant="outlined" fullWidth>
                                    <InputLabel>Select Solidity Version</InputLabel>
                                    <Select
                                        value={Object.keys(solcVersions.releases).find(
                                            (key) => solcVersions.releases[key] === usingVersion
                                        )}
                                        onChange={(e) => setUsingVersion(solcVersions.releases[e.target.value])}
                                        aria-label="Select Solidity version"
                                    >
                                        {Object.keys(solcVersions.releases).map((option) => (
                                            <MenuItem key={option} value={option}>
                                                {option} ({solcVersions.releases[option]})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
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
                                    <Typography variant="body1" className="block text-gray-700 mb-2">Select Contract:</Typography>
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
                                <Typography variant="h6" className="text-lg font-semibold text-black">Errors</Typography>
                                <ul className="list-disc pl-6 text-red-500 p-2 border border-red-300 rounded mt-2">
                                    {compiledContract.errors.map((err, idx) => (
                                        <li key={idx}>{err.formattedMessage}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default SolidityCompiler;