import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2, aws_eks as eks, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib';

export class DemoVappInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Minimal, low-cost VPC: 2 AZs, 1 NAT (OK for a POC)
    const vpc = new ec2.Vpc(this, 'PocVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create a simple kubectl layer with asset
    const kubectlLayer = new lambda.LayerVersion(this, 'KubectlLayer', {
      code: lambda.Code.fromAsset('kubectl-layer'),
      compatibleRuntimes: [
        lambda.Runtime.PYTHON_3_9, 
        lambda.Runtime.PYTHON_3_10, 
        lambda.Runtime.PYTHON_3_11
      ],
      description: 'Simple kubectl layer for EKS',
    });

    // EKS cluster with no default capacity
    const cluster = new eks.Cluster(this, 'PocEks', {
      version: eks.KubernetesVersion.V1_29,
      vpc,
      defaultCapacity: 0,
      kubectlLayer: kubectlLayer,
    });

    // Small managed node group
    cluster.addNodegroupCapacity('DefaultNg', {
      instanceTypes: [new ec2.InstanceType('t3.large')], // bump to t3.xlarge if you need more headroom
      desiredSize: 2,
      minSize: 1,
      maxSize: 3,
    });

    // Add IAM user to cluster access (replace with your IAM username)
    const adminUser = iam.User.fromUserName(this, 'AdminUser', 'matt-admin');
    cluster.awsAuth.addUserMapping(adminUser, {
      groups: ['system:masters'],
      username: 'matt-admin',
    });

    // Output cluster name for convenience
    new cdk.CfnOutput(this, 'ArdaDemoVappCluster', { value: cluster.clusterName });
  }
}
