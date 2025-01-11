"use client";

import React, { useState } from "react";
import axios from "axios";
import Button from '../energy-and-bandwith-calculator/components/Button';
import { Container, Typography, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card, CardContent, Box } from '@mui/material';

// Constants
const BROKERAGE_DEFAULT_RATIO = 0.2; // 20%
const DAILY_BLOCK_REWARD = 16; // TRX per block
const BLOCK_INTERVAL_SECONDS = 3; // 3 seconds per block
const SECONDS_IN_DAY = 86400; // Total seconds in a day
const DAYS_IN_MONTH = 30; // Days in a month
const SR_RANK_THRESHOLD = 27; // Top 27 are SRs
const SRP_RANK_THRESHOLD = 127; // Top 127 are SRPs

// Derived constants
const TOTAL_DAILY_BLOCKS = SECONDS_IN_DAY / BLOCK_INTERVAL_SECONDS; // Total blocks per day
const TOTAL_DAILY_BLOCK_REWARDS = DAILY_BLOCK_REWARD * TOTAL_DAILY_BLOCKS; // Total block rewards per day
const TOTAL_DAILY_VOTE_REWARDS = TOTAL_DAILY_BLOCK_REWARDS * 10; // Vote rewards are 10x block rewards
const API_TRONSCAN_URL = "https://apilist.tronscanapi.com/api/pagewitness?witnesstype=0";
const API_COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd";

interface Witness {
  address: string;
  realTimeVotes: number;
  brokerage: number;
  name: string;
}

interface TronscanWitnessResponse {
  total: number;
  data: {
    address: string;
    realTimeVotes: number;
    brokerage: number;
    name: string;
  }[];
}

interface Rewards {
  daily: {
    blockBeforeBrokerage: number;
    voteBeforeBrokerage: number;
    blockAfterBrokerage: number;
    voteAfterBrokerage: number;
    totalBeforeBrokerage: number;
    totalAfterBrokerage: number;
    usd: number;
  };
  monthly: {
    blockBeforeBrokerage: number;
    voteBeforeBrokerage: number;
    blockAfterBrokerage: number;
    voteAfterBrokerage: number;
    totalBeforeBrokerage: number;
    totalAfterBrokerage: number;
    usd: number;
  };
}

const SRSimulation = () => {
  const [inputAddress, setInputAddress] = useState<string>("");
  const [addressName, setAddressName] = useState<string | null>(null);
  const [srVotesNeeded, setSrVotesNeeded] = useState<string | number>(0);
  const [srpVotesNeeded, setSrpVotesNeeded] = useState<string | number>(0);
  const [brokerageRatio, setBrokerageRatio] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [trxPriceUSD, setTrxPriceUSD] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const formatNumberWithCommas = (number: number | string, isWholeNumber: boolean = false) =>
    typeof number === "number"
      ? number.toLocaleString(undefined, {
          minimumFractionDigits: isWholeNumber ? 0 : 2,
          maximumFractionDigits: isWholeNumber ? 0 : 2,
        })
      : number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const calculateUSD = (trxAmount: number) =>
    `$${formatNumberWithCommas(trxAmount * trxPriceUSD)}`;

  const fetchSRData = async () => {
    try {
      setError(null);

      if (!inputAddress) {
        setError("Please enter a valid TRON wallet address.");
        return;
      }

      const witnessResponse = await axios.get<TronscanWitnessResponse>(API_TRONSCAN_URL, {
        headers: {
          "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || "",
        },
      });

      const candidates: Witness[] = witnessResponse.data.data.map((witness) => ({
        address: witness.address,
        realTimeVotes: witness.realTimeVotes,
        brokerage: witness.brokerage / 100, // Convert brokerage to a decimal
        name: witness.name || "Unknown Address Holder",
      }));

      candidates.sort((a, b) => b.realTimeVotes - a.realTimeVotes);

      const userRank = candidates.findIndex(
        (candidate) => candidate.address === inputAddress
      );
      const userVotes = userRank >= 0 ? candidates[userRank].realTimeVotes : 0;
      const brokerageRatioValue = userRank >= 0 ? candidates[userRank].brokerage : BROKERAGE_DEFAULT_RATIO;
      const userName = userRank >= 0 ? candidates[userRank].name : "Unknown Address Holder";

      setBrokerageRatio(brokerageRatioValue);
      setAddressName(userName);

      const isSR = userRank >= 0 && userRank < SR_RANK_THRESHOLD;
      const isSRP = userRank >= SR_RANK_THRESHOLD && userRank < SRP_RANK_THRESHOLD;

      const srThreshold = candidates[SR_RANK_THRESHOLD - 1]?.realTimeVotes || 0;
      const srpThreshold = candidates[SRP_RANK_THRESHOLD - 1]?.realTimeVotes || 0;

      const votesNeededForSR = isSR ? "Already an SR" : formatNumberWithCommas(srThreshold - userVotes, true);
      const votesNeededForSRP = isSR
        ? "N/A"
        : isSRP
        ? "Already an SRP"
        : formatNumberWithCommas(srpThreshold - userVotes, true);

      setSrVotesNeeded(votesNeededForSR);
      setSrpVotesNeeded(votesNeededForSRP);

      const priceResponse = await axios.get<{ tron: { usd: number } }>(API_COINGECKO_URL);
      const trxPriceUSDValue = priceResponse.data.tron.usd;
      setTrxPriceUSD(trxPriceUSDValue);

      const eligibleCandidates = candidates.slice(0, SRP_RANK_THRESHOLD);
      const totalNetworkVotes = eligibleCandidates.reduce(
        (sum, candidate) => sum + candidate.realTimeVotes,
        0
      );

      const blocksProduced = isSR ? TOTAL_DAILY_BLOCKS / SR_RANK_THRESHOLD : 0;

      const dailyBlockRewardsBeforeBrokerage = blocksProduced * DAILY_BLOCK_REWARD;
      const dailyBlockRewardsAfterBrokerage =
        dailyBlockRewardsBeforeBrokerage * (1 - brokerageRatioValue);

      const isEligibleForVoteRewards = userRank >= 0 && userRank < SRP_RANK_THRESHOLD;
      const dailyVoteRewardsBeforeBrokerage = isEligibleForVoteRewards
        ? (userVotes / totalNetworkVotes) * TOTAL_DAILY_VOTE_REWARDS
        : 0;
      const dailyVoteRewardsAfterBrokerage =
        dailyVoteRewardsBeforeBrokerage * (1 - brokerageRatioValue);

      const dailyTotalBeforeBrokerage =
        dailyBlockRewardsBeforeBrokerage + dailyVoteRewardsBeforeBrokerage;
      const dailyTotalAfterBrokerage =
        dailyBlockRewardsAfterBrokerage + dailyVoteRewardsAfterBrokerage;

      const monthlyTotalBeforeBrokerage = dailyTotalBeforeBrokerage * DAYS_IN_MONTH;
      const monthlyTotalAfterBrokerage = dailyTotalAfterBrokerage * DAYS_IN_MONTH;

      const calculatedRewards: Rewards = {
        daily: {
          blockBeforeBrokerage: dailyBlockRewardsBeforeBrokerage,
          voteBeforeBrokerage: dailyVoteRewardsBeforeBrokerage,
          blockAfterBrokerage: dailyBlockRewardsAfterBrokerage,
          voteAfterBrokerage: dailyVoteRewardsAfterBrokerage,
          totalBeforeBrokerage: dailyTotalBeforeBrokerage,
          totalAfterBrokerage: dailyTotalAfterBrokerage,
          usd: dailyTotalAfterBrokerage * trxPriceUSDValue,
        },
        monthly: {
          blockBeforeBrokerage: dailyBlockRewardsBeforeBrokerage * DAYS_IN_MONTH,
          voteBeforeBrokerage: dailyVoteRewardsBeforeBrokerage * DAYS_IN_MONTH,
          blockAfterBrokerage: dailyBlockRewardsAfterBrokerage * DAYS_IN_MONTH,
          voteAfterBrokerage: dailyVoteRewardsAfterBrokerage * DAYS_IN_MONTH,
          totalBeforeBrokerage: monthlyTotalBeforeBrokerage,
          totalAfterBrokerage: monthlyTotalAfterBrokerage,
          usd: monthlyTotalAfterBrokerage * trxPriceUSDValue,
        },
      };

      setRewards(calculatedRewards);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Please try again.");
    }
  };

  return (
    <Container className="container" maxWidth="lg" sx={{ padding: '20px' }}>
      <Card sx={{ maxWidth: '95%', margin: 'auto', backgroundColor: '#f5f5f5', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
        <CardContent>
          <Typography variant="h4" sx={{ color: "#333", textAlign: "center", marginBottom: "30px", fontWeight: "bold" }}>
            SR / SRP Rewards Simulator
          </Typography>
          <div className="form-group flex flex-row mb-4">
            <TextField
              id="tron-address"
              label="Enter your TRON Wallet Address"
              variant="outlined"
              fullWidth
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="Enter TRON Wallet Address"
              sx={{ marginRight: '10px' }}
            />
            <Button variant="primary" className="w-[150px]" onClick={fetchSRData}>
              Simulate
            </Button>
          </div>

          {error && <Typography className="error" color="error" sx={{ marginBottom: '20px' }}>{error}</Typography>}

          {addressName && (
            <Typography variant="body1" sx={{ marginBottom: '20px' }}>Name: <strong>{addressName}</strong></Typography>
          )}

          {brokerageRatio !== null && (
            <Typography variant="body1" sx={{ marginBottom: '20px' }}>
              Brokerage Ratio: <span  className="font-bold" title="The percentage of rewards retained by the SR/SRP for operational costs">{(brokerageRatio * 100).toFixed(2)}%</span>
            </Typography>
          )}

          {rewards && (
            <div>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '20px' }}>Results:</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', width: '50%' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">Votes needed to become SR:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{srVotesNeeded}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">Votes needed to become SRP:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{srpVotesNeeded}</Typography>
                </Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.2rem',  marginTop: '20px' }}>Rewards Table:</Typography>
              <TableContainer component={Paper} sx={{ marginTop: '20px', marginBottom: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ background: '#f8ece8', color: 'white' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Period</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }} title="Rewards from block production before deducting brokerage">Block Rewards <br />(Before Brokerage)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }} title="Rewards from block production after deducting brokerage">Block Rewards <br />(After Brokerage)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }} title="Vote rewards before deducting brokerage">Vote Rewards <br />(Before Brokerage)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }} title="Vote rewards after deducting brokerage">Vote Rewards <br />(After Brokerage)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }} title="Total rewards before deducting brokerage">Total <br />(Before Brokerage)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }} title="Total rewards after deducting brokerage">Total <br />(After Brokerage)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <TableCell>Daily</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.daily.blockBeforeBrokerage)} TRX<br />({calculateUSD(rewards.daily.blockBeforeBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.daily.blockAfterBrokerage)} TRX<br />({calculateUSD(rewards.daily.blockAfterBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.daily.voteBeforeBrokerage)} TRX<br />({calculateUSD(rewards.daily.voteBeforeBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.daily.voteAfterBrokerage)} TRX<br />({calculateUSD(rewards.daily.voteAfterBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.daily.totalBeforeBrokerage)} TRX<br />({calculateUSD(rewards.daily.totalBeforeBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.daily.totalAfterBrokerage)} TRX<br />({calculateUSD(rewards.daily.totalAfterBrokerage)})</TableCell>
                    </TableRow>
                    <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <TableCell>Monthly</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.monthly.blockBeforeBrokerage)} TRX<br />({calculateUSD(rewards.monthly.blockBeforeBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.monthly.blockAfterBrokerage)} TRX<br />({calculateUSD(rewards.monthly.blockAfterBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.monthly.voteBeforeBrokerage)} TRX<br />({calculateUSD(rewards.monthly.voteBeforeBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.monthly.voteAfterBrokerage)} TRX<br />({calculateUSD(rewards.monthly.voteAfterBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.monthly.totalBeforeBrokerage)} TRX<br />({calculateUSD(rewards.monthly.totalBeforeBrokerage)})</TableCell>
                      <TableCell>{formatNumberWithCommas(rewards.monthly.totalAfterBrokerage)} TRX<br />({calculateUSD(rewards.monthly.totalAfterBrokerage)})</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default SRSimulation;
