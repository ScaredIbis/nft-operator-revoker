import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Table } from "antd";
import { StopOutlined } from "@ant-design/icons";
import ERC721 from "../abi/ERC721.json";
import { useCallback } from "react";

const knownOperators = {
  OpenSea: {
    address: "0x597120a6fc0fa817df3F463bF0A5e2Abe7a26A8C",
  },
};

const moralisHeaders = {
  "X-API-Key": process.env.REACT_APP_MORALIS_WEB3_API_KEY,
  accept: "application/json",
};

const columns = [
  {
    title: "Token",
    dataIndex: "token",
    key: "token",
    render: ({ collectionName, thumbnail, address }) => (
      <>
        <img src={thumbnail} alt={collectionName} width="75px" />{" "}
        <strong>
          <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noreferrer">
            {collectionName}
          </a>
        </strong>
      </>
    ),
  },
  {
    title: "Approved Operator",
    dataIndex: "operator",
    key: "operator",
    render: ({ name, address }) => (
      <strong>
        <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noreferrer">
          {name}
        </a>
      </strong>
    ),
  },
  {
    title: "Actions",
    key: "action",
    dataIndex: "action",
    render: ({ revokeApproval }) => (
      <div style={{ cursor: "pointer", fontWeight: "bold" }} onClick={revokeApproval}>
        <StopOutlined /> Revoke Approval
      </div>
    ),
  },
];

/**
 * web3 props can be passed from '../App.jsx' into your local view component for use
 * @param {*} yourLocalBalance balance on current network
 * @param {*} selectedChainId
 * @param {*} transactor
 * @returns react component
 */
function Home({ signer, selectedChainId, transactor }) {
  const [nftApprovals, setNftApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNFTs = useCallback(async () => {
    // only fetch data on mainnet and when all web3 stuff is connected
    if (!loading && signer && selectedChainId === 1) {
      const connectedAddress = await signer.getAddress();
      setLoading(true);
      const nftTransfers = await fetch(
        `https://deep-index.moralis.io/api/v2/${connectedAddress}/nft/transfers?chain=eth&format=decimal`,
        {
          headers: moralisHeaders,
        },
      )
        .then(resp => console.log("GOT RESP", resp) || resp.json())
        .catch(error => {
          console.error("FAILED FETCHING NFTS", error);
          return { result: [] };
        });

      const uniqueNFTAddressesInteracted = {};

      const nftApprovals = [];

      for (const transfer of nftTransfers.result) {
        if (transfer.contract_type === "ERC721" || transfer.contract_type === "ERC1155")
          uniqueNFTAddressesInteracted[transfer.token_address] = transfer.token_id;
      }

      const nftApprovalsPromises = Object.keys(uniqueNFTAddressesInteracted).map(async nftAddress => {
        const contract = new ethers.Contract(nftAddress, ERC721).connect(signer);

        for (const knownOperatorName in knownOperators) {
          const hasApproval = await contract.isApprovedForAll(
            connectedAddress,
            knownOperators[knownOperatorName].address,
          );

          if (hasApproval) {
            const tokenDetails = await fetch(
              `https://deep-index.moralis.io/api/v2/nft/${nftAddress}/${uniqueNFTAddressesInteracted[nftAddress]}?chain=eth&format=decimal`,
              {
                headers: moralisHeaders,
              },
            )
              .then(resp => resp.json())
              .catch(error => {
                console.error("FAILED FETCHING TOKE METADATA", error);
                return null;
              });

            if (!tokenDetails) {
              return;
            }

            const parsedMetadata = JSON.parse(tokenDetails.metadata);

            nftApprovals.push({
              key: `${nftAddress}-${knownOperatorName}`,
              token: {
                thumbnail: parsedMetadata.image,
                collectionName: tokenDetails.name,
                symbol: tokenDetails.symbol,
                address: nftAddress,
              },
              operator: {
                name: knownOperatorName,
                address: knownOperators[knownOperatorName].address,
              },
              action: {
                contract: contract,
                revokeApproval: () => {
                  transactor(contract.setApprovalForAll(knownOperators[knownOperatorName].address, false), () => {
                    fetchNFTs();
                  });
                },
              },
            });
          }
        }
      });

      await Promise.all(nftApprovalsPromises);

      setNftApprovals(nftApprovals);
      setLoading(false);
    }
  }, [signer, selectedChainId, transactor]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return (
    <div>
      <Table loading={loading} dataSource={nftApprovals} columns={columns} pagination={false} />
    </div>
  );
}

export default Home;
