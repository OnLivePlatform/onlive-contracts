FROM ethereum/solc:0.4.18 AS solc

FROM python:3.6.4
COPY --from=solc /usr/bin/solc /usr/bin/solc
RUN pip3 install solidity-flattener
ENTRYPOINT ["solidity_flattener"]
