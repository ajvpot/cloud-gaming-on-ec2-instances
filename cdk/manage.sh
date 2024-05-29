#!/usr/bin/env bash

set -euxo pipefail

STACK_NAME="CloudTD"
INSTANCE_ID=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --query "StackResources[?ResourceType=='AWS::EC2::Instance'].PhysicalResourceId" --output text)
INSTANCE_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
PASSWORD=$(aws ec2 get-password-data --instance-id "$INSTANCE_ID" --priv-launch-key GamingOnEc2.pem --query PasswordData --output text)

function usage() {
    echo "Usage: $0 {rdp|dcv|start|stop|deploy|create-ami|help} [ami-name]"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

ACTION=$1

case "$ACTION" in
    rdp)
        xfreerdp "/u:Administrator" "/v:$INSTANCE_IP" "/p:$PASSWORD"
        ;;
    dcv)
        xdg-open "https://$INSTANCE_IP:8443/#console"
        echo "$PASSWORD"
        ;;
    start)
        aws ec2 start-instances --instance-ids "$INSTANCE_ID"
        echo "Instance $INSTANCE_ID starting..."
        ;;
    stop)
        aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
        echo "Instance $INSTANCE_ID stopping..."
        ;;
    deploy)
        cdk deploy "$STACK_NAME" --no-rollback --concurrency=3 --require-approval=never
        ;;
    create-ami)
        if [ $# -ne 2 ]; then
            echo "Error: AMI name is required for create-ami action."
            usage
        fi
        AMI_NAME=$2
        aws ec2 create-image --instance-id "$INSTANCE_ID" --name "$AMI_NAME"
        echo "Creating AMI with name $AMI_NAME from instance $INSTANCE_ID..."
        ;;
    help)
        usage
        ;;
    *)
        echo "Invalid action: $ACTION"
        usage
        ;;
esac
