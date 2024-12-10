"use client";

import React, { useState } from "react";
import axios from "axios";
import "../styles.css";

interface Witness {
  address: string;
  realTimeVotes: number;
  brokerage: number;
}

interface TronscanWitnessResponse {
  total: number;
  data: {
    address: string;
    realTimeVotes: number;
    brokerage: number;
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
  const [srVotesNeeded, setSrVotesNeeded] = useState<string | number>(0);
  const [srpVotesNeeded, setSrpVotesNeeded] = useState<string | number>(0);
  const [brokerageRatio, setBrokerageRatio] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [trxPriceUSD, setTrxPriceUSD] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const formatNumberWithCommas = (number: number) =>
    number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const calculateUSD = (trxAmount: number) =>
    `$${formatNumberWithCommas(trxAmount * trxPriceUSD)}`;

  const fetchSRData = async () => {
    try {
      setError(null);

      if (!inputAddress) {
        setError("Please enter a valid TRON wallet address.");
        return;
      }

      const witnessResponse = await axios.get<TronscanWitnessResponse>(
        "https://apilist.tronscanapi.com/api/pagewitness?witnesstype=0",
        {
          headers: {
            "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || "",
          },
        }
      );

      const candidates: Witness[] = witnessResponse.data.data.map((witness) => ({
        address: witness.address,
        realTimeVotes: witness.realTimeVotes,
        brokerage: witness.brokerage / 100, // Convert brokerage to a decimal
      }));

      candidates.sort((a, b) => b.realTimeVotes - a.realTimeVotes);

      const userRank = candidates.findIndex(
        (candidate) => candidate.address === inputAddress
      );
      const userVotes = userRank >= 0 ? candidates[userRank].realTimeVotes : 0;
      const brokerageRatioValue = userRank >= 0 ? candidates[userRank].brokerage : 0.2;
      setBrokerageRatio(brokerageRatioValue);

      const isSR = userRank >= 0 && userRank < 27;
      const isSRP = userRank >= 27 && userRank < 127;

      const srThreshold = candidates[26]?.realTimeVotes || 0;
      const srpThreshold = candidates[126]?.realTimeVotes || 0;

      const votesNeededForSR = isSR ? "Already an SR" : srThreshold - userVotes;
      const votesNeededForSRP = isSR
        ? "N/A"
        : isSRP
        ? "Already an SRP"
        : srpThreshold - userVotes;

      setSrVotesNeeded(votesNeededForSR);
      setSrpVotesNeeded(votesNeededForSRP);

      const priceResponse = await axios.get<{ tron: { usd: number } }>(
        "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd"
      );
      const trxPriceUSDValue = priceResponse.data.tron.usd;
      setTrxPriceUSD(trxPriceUSDValue);

      const eligibleCandidates = candidates.slice(0, 127);
      const totalNetworkVotes = eligibleCandidates.reduce(
        (sum, candidate) => sum + candidate.realTimeVotes,
        0
      );

      const blocksProduced = isSR ? 1600 : 0;

      const dailyBlockRewardsBeforeBrokerage = blocksProduced * 16;
      const dailyBlockRewardsAfterBrokerage =
        dailyBlockRewardsBeforeBrokerage * (1 - brokerageRatioValue);

      const isEligibleForVoteRewards = userRank >= 0 && userRank < 127;
      const dailyVoteRewardsBeforeBrokerage = isEligibleForVoteRewards
        ? (userVotes / totalNetworkVotes) * 115200
        : 0;
      const dailyVoteRewardsAfterBrokerage =
        dailyVoteRewardsBeforeBrokerage * (1 - brokerageRatioValue);

      const dailyTotalBeforeBrokerage =
        dailyBlockRewardsBeforeBrokerage + dailyVoteRewardsBeforeBrokerage;
      const dailyTotalAfterBrokerage =
        dailyBlockRewardsAfterBrokerage + dailyVoteRewardsAfterBrokerage;

      const monthlyTotalBeforeBrokerage = dailyTotalBeforeBrokerage * 30;
      const monthlyTotalAfterBrokerage = dailyTotalAfterBrokerage * 30;

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
          blockBeforeBrokerage: dailyBlockRewardsBeforeBrokerage * 30,
          voteBeforeBrokerage: dailyVoteRewardsBeforeBrokerage * 30,
          blockAfterBrokerage: dailyBlockRewardsAfterBrokerage * 30,
          voteAfterBrokerage: dailyVoteRewardsAfterBrokerage * 30,
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
    <div className="container">
      <h1 style={{ color: "#333", textAlign: "center", marginBottom: "20px", fontSize: "36px", fontWeight: "bold" }}>
        SR / SRP Rewards Simulator
      </h1>
      <div className="form-group">
        <label htmlFor="tron-address">Enter your TRON Wallet Address:</label>
        <input
          id="tron-address"
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter TRON Wallet Address"
        />
        <button onClick={fetchSRData}>Simulate</button>
      </div>

      {error && <p className="error">{error}</p>}

      {brokerageRatio !== null && (
        <p>Brokerage Ratio: {(brokerageRatio * 100).toFixed(2)}%</p>
      )}

      {rewards && (
        <div>
          <h2 style={{ color: "#333", marginTop: "20px" }}>Results:</h2>
          <p>Votes needed to become SR: <strong>{srVotesNeeded}</strong></p>
          <p>Votes needed to become SRP: <strong>{srpVotesNeeded}</strong></p>

          <h3>Rewards Table:</h3>
          <table className="rewards-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Block Rewards (Before Brokerage)</th>
                <th>Block Rewards (After Brokerage)</th>
                <th>Vote Rewards (Before Brokerage)</th>
                <th>Vote Rewards (After Brokerage)</th>
                <th>Total (Before Brokerage)</th>
                <th>Total (After Brokerage)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Daily</td>
                <td>
                  {formatNumberWithCommas(rewards.daily.blockBeforeBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.daily.blockBeforeBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.daily.blockAfterBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.daily.blockAfterBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.daily.voteBeforeBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.daily.voteBeforeBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.daily.voteAfterBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.daily.voteAfterBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.daily.totalBeforeBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.daily.totalBeforeBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.daily.totalAfterBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.daily.totalAfterBrokerage)})
                </td>
              </tr>
              <tr>
                <td>Monthly</td>
                <td>
                  {formatNumberWithCommas(rewards.monthly.blockBeforeBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.monthly.blockBeforeBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.monthly.blockAfterBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.monthly.blockAfterBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.monthly.voteBeforeBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.monthly.voteBeforeBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.monthly.voteAfterBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.monthly.voteAfterBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.monthly.totalBeforeBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.monthly.totalBeforeBrokerage)})
                </td>
                <td>
                  {formatNumberWithCommas(rewards.monthly.totalAfterBrokerage)} TRX
                  <br />
                  ({calculateUSD(rewards.monthly.totalAfterBrokerage)})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SRSimulation;
