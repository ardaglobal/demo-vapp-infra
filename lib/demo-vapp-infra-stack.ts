import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2, aws_eks as eks, aws_lambda as lambda } from 'aws-cdk-lib';

export class DemoVappInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Minimal, low-cost VPC: 2 AZs, 1 NAT (OK for a POC)
    const vpc = new ec2.Vpc(this, 'PocVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // EKS cluster with no default capacity
    const cluster = new eks.Cluster(this, 'PocEks', {
      version: eks.KubernetesVersion.V1_29,
      vpc,
      defaultCapacity: 0,
      kubectlLayer: lambda.LayerVersion.fromLayerVersionArn(this, 'KubectlLayer', 
        'arn:aws:lambda:us-east-1:553035198032:layer:kubectl:1'
      ),
    });

    // Small managed node group
    cluster.addNodegroupCapacity('DefaultNg', {
      instanceTypes: [new ec2.InstanceType('t3.large')], // bump to t3.xlarge if you need more headroom
      desiredSize: 2,
      minSize: 1,
      maxSize: 3,
    });

    // Output cluster name for convenience
    new cdk.CfnOutput(this, 'ArdaDemoVappCluster', { value: cluster.clusterName });
  }
}
